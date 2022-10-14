/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { countBy, partition } from 'lodash/fp';
import uuid from 'uuid';
import type { RuleAction } from '@kbn/securitysolution-io-ts-alerting-types';
import type { SavedObjectsClientContract } from '@kbn/core/server';
import pMap from 'p-map';

import type { PartialRule, FindResult } from '@kbn/alerting-plugin/server';
import type { ActionsClient, FindActionResult } from '@kbn/actions-plugin/server';
import type { RuleExecutionSummary } from '../../../../../common/detection_engine/rule_monitoring';
import type { ImportRulesSchema } from '../../../../../common/detection_engine/schemas/request/import_rules_schema';
import type { CreateRulesBulkSchema } from '../../../../../common/detection_engine/schemas/request/create_rules_bulk_schema';
import type { RuleAlertType, RuleParams } from '../../rule_schema';
import { isAlertType } from '../../rule_schema';
import type { BulkError, OutputError } from '../../routes/utils';
import { createBulkErrorObject } from '../../routes/utils';
// TODO: https://github.com/elastic/kibana/pull/142950
import { internalRuleToAPIResponse } from '../normalization/rule_converters';
// eslint-disable-next-line no-restricted-imports
import type { LegacyRulesActionsSavedObject } from '../../rule_actions_legacy';
import type { RuleExecutionSummariesByRuleId } from '../../rule_monitoring';
import type { FullResponseSchema } from '../../../../../common/detection_engine/schemas/request';

type PromiseFromStreams = ImportRulesSchema | Error;
const MAX_CONCURRENT_SEARCHES = 10;

export const getIdError = ({
  id,
  ruleId,
}: {
  id: string | undefined | null;
  ruleId: string | undefined | null;
}): OutputError => {
  if (id != null) {
    return {
      message: `id: "${id}" not found`,
      statusCode: 404,
    };
  } else if (ruleId != null) {
    return {
      message: `rule_id: "${ruleId}" not found`,
      statusCode: 404,
    };
  } else {
    return {
      message: 'id or rule_id should have been defined',
      statusCode: 404,
    };
  }
};

export const getIdBulkError = ({
  id,
  ruleId,
}: {
  id: string | undefined | null;
  ruleId: string | undefined | null;
}): BulkError => {
  if (id != null && ruleId != null) {
    return createBulkErrorObject({
      id,
      ruleId,
      statusCode: 404,
      message: `id: "${id}" and rule_id: "${ruleId}" not found`,
    });
  } else if (id != null) {
    return createBulkErrorObject({
      id,
      statusCode: 404,
      message: `id: "${id}" not found`,
    });
  } else if (ruleId != null) {
    return createBulkErrorObject({
      ruleId,
      statusCode: 404,
      message: `rule_id: "${ruleId}" not found`,
    });
  } else {
    return createBulkErrorObject({
      statusCode: 404,
      message: `id or rule_id should have been defined`,
    });
  }
};

// TODO: https://github.com/elastic/kibana/pull/142950
export const transformAlertsToRules = (
  rules: RuleAlertType[],
  legacyRuleActions: Record<string, LegacyRulesActionsSavedObject>
): FullResponseSchema[] => {
  return rules.map((rule) => internalRuleToAPIResponse(rule, null, legacyRuleActions[rule.id]));
};

// TODO: https://github.com/elastic/kibana/pull/142950
export const transformFindAlerts = (
  ruleFindResults: FindResult<RuleParams>,
  ruleExecutionSummariesByRuleId: RuleExecutionSummariesByRuleId,
  legacyRuleActions: Record<string, LegacyRulesActionsSavedObject | undefined>
): {
  page: number;
  perPage: number;
  total: number;
  data: Array<Partial<FullResponseSchema>>;
} | null => {
  return {
    page: ruleFindResults.page,
    perPage: ruleFindResults.perPage,
    total: ruleFindResults.total,
    data: ruleFindResults.data.map((rule) => {
      const executionSummary = ruleExecutionSummariesByRuleId[rule.id];
      return internalRuleToAPIResponse(rule, executionSummary, legacyRuleActions[rule.id]);
    }),
  };
};

// TODO: https://github.com/elastic/kibana/pull/142950
export const transform = (
  rule: PartialRule<RuleParams>,
  ruleExecutionSummary?: RuleExecutionSummary | null,
  legacyRuleActions?: LegacyRulesActionsSavedObject | null
): FullResponseSchema | null => {
  if (isAlertType(rule)) {
    return internalRuleToAPIResponse(rule, ruleExecutionSummary, legacyRuleActions);
  }

  return null;
};

export const getDuplicates = (ruleDefinitions: CreateRulesBulkSchema, by: 'rule_id'): string[] => {
  const mappedDuplicates = countBy(
    by,
    ruleDefinitions.filter((r) => r[by] != null)
  );
  const hasDuplicates = Object.values(mappedDuplicates).some((i) => i > 1);
  if (hasDuplicates) {
    return Object.keys(mappedDuplicates).filter((key) => mappedDuplicates[key] > 1);
  }
  return [];
};

export const getTupleDuplicateErrorsAndUniqueRules = (
  rules: PromiseFromStreams[],
  isOverwrite: boolean
): [BulkError[], PromiseFromStreams[]] => {
  const { errors, rulesAcc } = rules.reduce(
    (acc, parsedRule) => {
      if (parsedRule instanceof Error) {
        acc.rulesAcc.set(uuid.v4(), parsedRule);
      } else {
        const { rule_id: ruleId } = parsedRule;
        if (acc.rulesAcc.has(ruleId) && !isOverwrite) {
          acc.errors.set(
            uuid.v4(),
            createBulkErrorObject({
              ruleId,
              statusCode: 400,
              message: `More than one rule with rule-id: "${ruleId}" found`,
            })
          );
        }
        acc.rulesAcc.set(ruleId, parsedRule);
      }

      return acc;
    }, // using map (preserves ordering)
    {
      errors: new Map<string, BulkError>(),
      rulesAcc: new Map<string, PromiseFromStreams>(),
    }
  );

  return [Array.from(errors.values()), Array.from(rulesAcc.values())];
};

// functions copied from here
// https://github.com/elastic/kibana/blob/4584a8b570402aa07832cf3e5b520e5d2cfa7166/src/core/server/saved_objects/import/lib/check_origin_conflicts.ts#L55-L57
const createQueryTerm = (input: string) => input.replace(/\\/g, '\\\\').replace(/\"/g, '\\"');
const createQuery = (type: string, id: string) =>
  `"${createQueryTerm(`${type}:${id}`)}" | "${createQueryTerm(id)}"`;

/**
 * Query for a saved object with a given origin id and replace the
 * id in the provided action with the _id from the query result
 * @param action
 * @param esClient
 * @returns
 */
export const swapActionIds = async (
  action: RuleAction,
  savedObjectsClient: SavedObjectsClientContract
): Promise<RuleAction | Error> => {
  try {
    const search = createQuery('action', action.id);
    const foundAction = await savedObjectsClient.find<RuleAction>({
      type: 'action',
      search,
      rootSearchFields: ['_id', 'originId'],
    });

    if (foundAction.saved_objects.length === 1) {
      return { ...action, id: foundAction.saved_objects[0].id };
    } else if (foundAction.saved_objects.length > 1) {
      return new Error(
        `Found two action connectors with originId or _id: ${action.id} The upload cannot be completed unless the _id or the originId of the action connector is changed. See https://www.elastic.co/guide/en/kibana/current/sharing-saved-objects.html for more details`
      );
    }
    return action;
  } catch (exc) {
    return exc;
  }
};

/**
 * In 8.0 all saved objects made in a non-default space will have their
 * _id's regenerated. Security Solution rules have references to the
 * actions SO id inside the 'actions' param.
 * When users import these rules, we need to ensure any rule with
 * an action that has an old, pre-8.0 id will need to be updated
 * to point to the new _id for that action (alias_target_id)
 *
 * ex:
 * import rule.ndjson:
 * {
 *   rule_id: 'myrule_id'
 *   name: 'my favorite rule'
 *   ...
 *   actions:[{id: '1111-2222-3333-4444', group...}]
 * }
 *
 * In 8.0 the 'id' field of this action is no longer a reference
 * to the _id of the action (connector). Querying against the connector
 * endpoint for this id will yield 0 results / 404.
 *
 * The solution: If we query the .kibana index for '1111-2222-3333-4444' as an originId,
 * we should get the original connector back
 * (with the new, migrated 8.0 _id of 'xxxx-yyyy-zzzz-0000') and can then replace
 * '1111-2222-3333-4444' in the example above with 'xxxx-yyyy-zzzz-0000'
 * And the rule will then import successfully.
 * @param rules
 * @param savedObjectsClient SO client exposing hidden 'actions' SO type
 * @returns
 */
export const migrateLegacyActionsIds = async (
  rules: PromiseFromStreams[],
  savedObjectsClient: SavedObjectsClientContract
): Promise<PromiseFromStreams[]> => {
  const isImportRule = (r: unknown): r is ImportRulesSchema => !(r instanceof Error);

  const toReturn = await pMap(
    rules,
    async (rule) => {
      if (isImportRule(rule)) {
        // can we swap the pre 8.0 action connector(s) id with the new,
        // post-8.0 action id (swap the originId for the new _id?)
        const newActions: Array<RuleAction | Error> = await pMap(
          rule.actions ?? [],
          (action: RuleAction) => swapActionIds(action, savedObjectsClient),
          { concurrency: MAX_CONCURRENT_SEARCHES }
        );

        // were there any errors discovered while trying to migrate and swap the action connector ids?
        const [actionMigrationErrors, newlyMigratedActions] = partition<RuleAction | Error, Error>(
          (item): item is Error => item instanceof Error
        )(newActions);

        if (actionMigrationErrors == null || actionMigrationErrors.length === 0) {
          return { ...rule, actions: newlyMigratedActions };
        }

        return [
          { ...rule, actions: newlyMigratedActions },
          new Error(
            JSON.stringify(
              createBulkErrorObject({
                ruleId: rule.rule_id,
                statusCode: 409,
                message: `${actionMigrationErrors.map((error: Error) => error.message).join(',')}`,
              })
            )
          ),
        ];
      }
      return rule;
    },
    { concurrency: MAX_CONCURRENT_SEARCHES }
  );
  return toReturn.flat();
};

/**
 * Given a set of rules and an actions client this will return connectors that are invalid
 * such as missing connectors and filter out the rules that have invalid connectors.
 * @param rules The rules to check for invalid connectors
 * @param actionsClient The actions client to get all the connectors.
 * @returns An array of connector errors if it found any and then the promise stream of valid and invalid connectors.
 */
export const getInvalidConnectors = async (
  rules: PromiseFromStreams[],
  actionsClient: ActionsClient
): Promise<[BulkError[], PromiseFromStreams[]]> => {
  let actionsFind: FindActionResult[] = [];
  const reducerAccumulator = {
    errors: new Map<string, BulkError>(),
    rulesAcc: new Map<string, PromiseFromStreams>(),
  };
  try {
    actionsFind = await actionsClient.getAll();
  } catch (exc) {
    if (exc?.output?.statusCode === 403) {
      reducerAccumulator.errors.set(
        uuid.v4(),
        createBulkErrorObject({
          statusCode: exc.output.statusCode,
          message: `You may not have actions privileges required to import rules with actions: ${exc.output.payload.message}`,
        })
      );
    } else {
      reducerAccumulator.errors.set(
        uuid.v4(),
        createBulkErrorObject({
          statusCode: 404,
          message: JSON.stringify(exc),
        })
      );
    }
  }
  const actionIds = new Set(actionsFind.map((action) => action.id));
  const { errors, rulesAcc } = rules.reduce(
    (acc, parsedRule) => {
      if (parsedRule instanceof Error) {
        acc.rulesAcc.set(uuid.v4(), parsedRule);
      } else {
        const { rule_id: ruleId, actions } = parsedRule;
        const missingActionIds = actions
          ? actions.flatMap((action) => {
              if (!actionIds.has(action.id)) {
                return [action.id];
              } else {
                return [];
              }
            })
          : [];
        if (missingActionIds.length === 0) {
          acc.rulesAcc.set(ruleId, parsedRule);
        } else {
          const errorMessage =
            missingActionIds.length > 1
              ? 'connectors are missing. Connector ids missing are:'
              : 'connector is missing. Connector id missing is:';
          acc.errors.set(
            uuid.v4(),
            createBulkErrorObject({
              ruleId,
              statusCode: 404,
              message: `${missingActionIds.length} ${errorMessage} ${missingActionIds.join(', ')}`,
            })
          );
        }
      }
      return acc;
    }, // using map (preserves ordering)
    reducerAccumulator
  );

  return [Array.from(errors.values()), Array.from(rulesAcc.values())];
};
