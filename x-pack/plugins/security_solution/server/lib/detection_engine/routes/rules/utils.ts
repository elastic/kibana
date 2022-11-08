/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { countBy } from 'lodash/fp';
import { SavedObject } from 'kibana/server';
import uuid from 'uuid';

import { RulesSchema } from '../../../../../common/detection_engine/schemas/response/rules_schema';
import { ImportRulesSchemaDecoded } from '../../../../../common/detection_engine/schemas/request/import_rules_schema';
import { CreateRulesBulkSchema } from '../../../../../common/detection_engine/schemas/request/create_rules_bulk_schema';
import { PartialAlert, FindResult } from '../../../../../../alerting/server';
import { ActionsClient, FindActionResult } from '../../../../../../actions/server';
import { INTERNAL_IDENTIFIER } from '../../../../../common/constants';
import {
  RuleAlertType,
  isAlertType,
  IRuleSavedAttributesSavedObjectAttributes,
  isRuleStatusSavedObjectType,
  IRuleStatusSOAttributes,
} from '../../rules/types';
import { createBulkErrorObject, BulkError, OutputError } from '../utils';
import { internalRuleToAPIResponse } from '../../schemas/rule_converters';
import { RuleParams } from '../../schemas/rule_schemas';
import { SanitizedAlert } from '../../../../../../alerting/common';
// eslint-disable-next-line no-restricted-imports
import { LegacyRulesActionsSavedObject } from '../../rule_actions/legacy_get_rule_actions_saved_object';

type PromiseFromStreams = ImportRulesSchemaDecoded | Error;

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

export const transformTags = (tags: string[]): string[] => {
  return tags.filter((tag) => !tag.startsWith(INTERNAL_IDENTIFIER));
};

// Transforms the data but will remove any null or undefined it encounters and not include
// those on the export
export const transformAlertToRule = (
  alert: SanitizedAlert<RuleParams>,
  ruleStatus?: SavedObject<IRuleSavedAttributesSavedObjectAttributes>,
  legacyRuleActions?: LegacyRulesActionsSavedObject | null
): Partial<RulesSchema> => {
  return internalRuleToAPIResponse(alert, ruleStatus?.attributes, legacyRuleActions);
};

export const transformAlertsToRules = (
  alerts: RuleAlertType[],
  legacyRuleActions: Record<string, LegacyRulesActionsSavedObject>
): Array<Partial<RulesSchema>> => {
  return alerts.map((alert) => transformAlertToRule(alert, undefined, legacyRuleActions[alert.id]));
};

export const transformFindAlerts = (
  findResults: FindResult<RuleParams>,
  ruleStatuses: { [key: string]: IRuleStatusSOAttributes[] | undefined },
  legacyRuleActions: Record<string, LegacyRulesActionsSavedObject | undefined>
): {
  page: number;
  perPage: number;
  total: number;
  data: Array<Partial<RulesSchema>>;
} | null => {
  return {
    page: findResults.page,
    perPage: findResults.perPage,
    total: findResults.total,
    data: findResults.data.map((alert) => {
      const statuses = ruleStatuses[alert.id];
      const status = statuses ? statuses[0] : undefined;
      return internalRuleToAPIResponse(alert, status, legacyRuleActions[alert.id]);
    }),
  };
};

export const transform = (
  alert: PartialAlert<RuleParams>,
  ruleStatus?: SavedObject<IRuleSavedAttributesSavedObjectAttributes>,
  isRuleRegistryEnabled?: boolean,
  legacyRuleActions?: LegacyRulesActionsSavedObject | null
): Partial<RulesSchema> | null => {
  if (isAlertType(isRuleRegistryEnabled ?? false, alert)) {
    return transformAlertToRule(
      alert,
      isRuleStatusSavedObjectType(ruleStatus) ? ruleStatus : undefined,
      legacyRuleActions
    );
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
        const missingActionIds = actions.flatMap((action) => {
          if (!actionIds.has(action.id)) {
            return [action.id];
          } else {
            return [];
          }
        });
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
