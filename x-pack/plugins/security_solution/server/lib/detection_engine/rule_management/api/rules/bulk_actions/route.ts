/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { truncate } from 'lodash';
import moment from 'moment';
import { BadRequestError, transformError } from '@kbn/securitysolution-es-utils';
import type { KibanaResponseFactory, Logger, SavedObjectsClientContract } from '@kbn/core/server';

import type { RulesClient, BulkEditError } from '@kbn/alerting-plugin/server';
import type { SanitizedRule } from '@kbn/alerting-plugin/common';
import { AbortError } from '@kbn/kibana-utils-plugin/common';
import type { RuleAlertType, RuleParams } from '../../../../rule_schema';

import type { BulkActionsDryRunErrCode } from '../../../../../../../common/constants';
import {
  DETECTION_ENGINE_RULES_BULK_ACTION,
  MAX_RULES_TO_UPDATE_IN_PARALLEL,
  RULES_TABLE_MAX_PAGE_SIZE,
} from '../../../../../../../common/constants';
import {
  performBulkActionSchema,
  performBulkActionQuerySchema,
  BulkAction,
} from '../../../../../../../common/detection_engine/schemas/request/perform_bulk_action_schema';
import type { SetupPlugins } from '../../../../../../plugin';
import type { SecuritySolutionPluginRouter } from '../../../../../../types';
import { buildRouteValidation } from '../../../../../../utils/build_validation/route_validation';
import { routeLimitedConcurrencyTag } from '../../../../../../utils/route_limited_concurrency_tag';
import type { PromisePoolError, PromisePoolOutcome } from '../../../../../../utils/promise_pool';
import { initPromisePool } from '../../../../../../utils/promise_pool';
import { buildMlAuthz } from '../../../../../machine_learning/authz';
import { deleteRules } from '../../../logic/crud/delete_rules';
import { duplicateRule } from '../../../logic/actions/duplicate_rule';
import { findRules } from '../../../logic/search/find_rules';
import { readRules } from '../../../logic/crud/read_rules';
import { getExportByObjectIds } from '../../../logic/export/get_export_by_object_ids';
import { buildSiemResponse } from '../../../../routes/utils';
import { internalRuleToAPIResponse } from '../../../normalization/rule_converters';
// eslint-disable-next-line no-restricted-imports
import { legacyMigrate } from '../../../logic/rule_actions/legacy_action_migration';
import { bulkEditRules } from '../../../logic/bulk_actions/bulk_edit_rules';
import type { DryRunError } from '../../../logic/bulk_actions/dry_run';
import {
  validateBulkEnableRule,
  validateBulkDisableRule,
  validateBulkDuplicateRule,
  dryRunValidateBulkEditRule,
} from '../../../logic/bulk_actions/validations';

const MAX_RULES_TO_PROCESS_TOTAL = 10000;
const MAX_ERROR_MESSAGE_LENGTH = 1000;
const MAX_ROUTE_CONCURRENCY = 5;

interface RuleDetailsInError {
  id: string;
  name?: string;
}
interface NormalizedRuleError {
  message: string;
  status_code: number;
  err_code?: BulkActionsDryRunErrCode;
  rules: RuleDetailsInError[];
}

type BulkActionError = PromisePoolError<string> | PromisePoolError<RuleAlertType> | BulkEditError;

const normalizeErrorResponse = (errors: BulkActionError[]): NormalizedRuleError[] => {
  const errorsMap = new Map<string, NormalizedRuleError>();

  errors.forEach((errorObj) => {
    let message: string;
    let statusCode: number = 500;
    let errorCode: BulkActionsDryRunErrCode | undefined;
    let rule: RuleDetailsInError;
    // transform different error types (PromisePoolError<string> | PromisePoolError<RuleAlertType> | BulkEditError)
    // to one common used in NormalizedRuleError
    if ('rule' in errorObj) {
      rule = errorObj.rule;
      message = errorObj.message;
    } else {
      const { error, item } = errorObj;
      const transformedError =
        error instanceof Error
          ? transformError(error)
          : { message: String(error), statusCode: 500 };

      errorCode = (error as DryRunError)?.errorCode;
      message = transformedError.message;
      statusCode = transformedError.statusCode;
      // The promise pool item is either a rule ID string or a rule object. We have
      // string IDs when we fail to fetch rules. Rule objects come from other
      // situations when we found a rule but failed somewhere else.
      rule = typeof item === 'string' ? { id: item } : { id: item.id, name: item.name };
    }

    if (errorsMap.has(message)) {
      errorsMap.get(message)?.rules.push(rule);
    } else {
      errorsMap.set(message, {
        message: truncate(message, { length: MAX_ERROR_MESSAGE_LENGTH }),
        status_code: statusCode,
        err_code: errorCode,
        rules: [rule],
      });
    }
  });

  return Array.from(errorsMap, ([_, normalizedError]) => normalizedError);
};

const buildBulkResponse = (
  response: KibanaResponseFactory,
  {
    isDryRun = false,
    errors = [],
    updated = [],
    created = [],
    deleted = [],
  }: {
    isDryRun?: boolean;
    errors?: BulkActionError[];
    updated?: RuleAlertType[];
    created?: RuleAlertType[];
    deleted?: RuleAlertType[];
  }
) => {
  const numSucceeded = updated.length + created.length + deleted.length;
  const numFailed = errors.length;
  const summary = {
    failed: numFailed,
    succeeded: numSucceeded,
    total: numSucceeded + numFailed,
  };

  // if response is for dry_run, empty lists of rules returned, as rules are not actually updated and stored within ES
  // thus, it's impossible to return reliably updated/duplicated/deleted rules
  const results = isDryRun
    ? {
        updated: [],
        created: [],
        deleted: [],
      }
    : {
        updated: updated.map((rule) => internalRuleToAPIResponse(rule)),
        created: created.map((rule) => internalRuleToAPIResponse(rule)),
        deleted: deleted.map((rule) => internalRuleToAPIResponse(rule)),
      };

  if (numFailed > 0) {
    return response.custom({
      headers: { 'content-type': 'application/json' },
      body: Buffer.from(
        JSON.stringify({
          message: summary.succeeded > 0 ? 'Bulk edit partially failed' : 'Bulk edit failed',
          status_code: 500,
          attributes: {
            errors: normalizeErrorResponse(errors),
            results,
            summary,
          },
        })
      ),
      statusCode: 500,
    });
  }

  return response.ok({
    body: {
      success: true,
      rules_count: summary.total,
      attributes: { results, summary },
    },
  });
};

const fetchRulesByQueryOrIds = async ({
  query,
  ids,
  rulesClient,
  abortSignal,
}: {
  query: string | undefined;
  ids: string[] | undefined;
  rulesClient: RulesClient;
  abortSignal: AbortSignal;
}): Promise<PromisePoolOutcome<string, RuleAlertType>> => {
  if (ids) {
    return initPromisePool({
      concurrency: MAX_RULES_TO_UPDATE_IN_PARALLEL,
      items: ids,
      executor: async (id: string) => {
        const rule = await readRules({ id, rulesClient, ruleId: undefined });
        if (rule == null) {
          throw Error('Rule not found');
        }
        return rule;
      },
      abortSignal,
    });
  }

  const { data, total } = await findRules({
    rulesClient,
    perPage: MAX_RULES_TO_PROCESS_TOTAL,
    filter: query,
    page: undefined,
    sortField: undefined,
    sortOrder: undefined,
    fields: undefined,
  });

  if (total > MAX_RULES_TO_PROCESS_TOTAL) {
    throw new BadRequestError(
      `More than ${MAX_RULES_TO_PROCESS_TOTAL} rules matched the filter query. Try to narrow it down.`
    );
  }

  return {
    results: data.map((rule) => ({ item: rule.id, result: rule })),
    errors: [],
  };
};

/**
 * Helper method to migrate any legacy actions a rule may have. If no actions or no legacy actions
 * no migration is performed.
 * @params rulesClient
 * @params savedObjectsClient
 * @params rule - rule to be migrated
 * @returns The migrated rule
 */
export const migrateRuleActions = async ({
  rulesClient,
  savedObjectsClient,
  rule,
}: {
  rulesClient: RulesClient;
  savedObjectsClient: SavedObjectsClientContract;
  rule: RuleAlertType;
}): Promise<SanitizedRule<RuleParams>> => {
  const migratedRule = await legacyMigrate({
    rulesClient,
    savedObjectsClient,
    rule,
  });

  // This should only be hit if `rule` passed into `legacyMigrate`
  // is `null` or `rule.id` is null which right now, as typed, should not occur
  // but catching if does, in which case something upstream would be breaking down
  if (migratedRule == null) {
    throw new Error(`An error occurred processing rule with id:${rule.id}`);
  }

  return migratedRule;
};

export const performBulkActionRoute = (
  router: SecuritySolutionPluginRouter,
  ml: SetupPlugins['ml'],
  logger: Logger
) => {
  router.post(
    {
      path: DETECTION_ENGINE_RULES_BULK_ACTION,
      validate: {
        body: buildRouteValidation<typeof performBulkActionSchema>(performBulkActionSchema),
        query: buildRouteValidation<typeof performBulkActionQuerySchema>(
          performBulkActionQuerySchema
        ),
      },
      options: {
        tags: ['access:securitySolution', routeLimitedConcurrencyTag(MAX_ROUTE_CONCURRENCY)],
        timeout: {
          idleSocket: moment.duration(15, 'minutes').asMilliseconds(),
        },
      },
    },
    async (context, request, response) => {
      const { body } = request;
      const siemResponse = buildSiemResponse(response);

      if (body?.ids && body.ids.length > RULES_TABLE_MAX_PAGE_SIZE) {
        return siemResponse.error({
          body: `More than ${RULES_TABLE_MAX_PAGE_SIZE} ids sent for bulk edit action.`,
          statusCode: 400,
        });
      }

      if (body?.ids && body.query !== undefined) {
        return siemResponse.error({
          body: `Both query and ids are sent. Define either ids or query in request payload.`,
          statusCode: 400,
        });
      }

      const isDryRun = request.query.dry_run === 'true';

      // dry run is not supported for export, as it doesn't change ES state and has different response format(exported JSON file)
      if (isDryRun && body.action === BulkAction.export) {
        return siemResponse.error({
          body: `Export action doesn't support dry_run mode`,
          statusCode: 400,
        });
      }

      const abortController = new AbortController();

      // subscribing to completed$, because it handles both cases when request was completed and aborted.
      // when route is finished by timeout, aborted$ is not getting fired
      request.events.completed$.subscribe(() => abortController.abort());
      try {
        const ctx = await context.resolve([
          'core',
          'securitySolution',
          'alerting',
          'licensing',
          'lists',
        ]);

        const rulesClient = ctx.alerting.getRulesClient();
        const ruleExecutionLog = ctx.securitySolution.getRuleExecutionLog();
        const exceptionsClient = ctx.lists?.getExceptionListClient();
        const savedObjectsClient = ctx.core.savedObjects.client;

        const mlAuthz = buildMlAuthz({
          license: ctx.licensing.license,
          ml,
          request,
          savedObjectsClient,
        });

        const query = body.query !== '' ? body.query : undefined;

        // handling this action before switch statement as bulkEditRules fetch rules within
        // rulesClient method, hence there is no need to use fetchRulesByQueryOrIds utility
        if (body.action === BulkAction.edit && !isDryRun) {
          const { rules, errors } = await bulkEditRules({
            rulesClient,
            filter: query,
            ids: body.ids,
            actions: body.edit,
            mlAuthz,
          });

          // migrate legacy rule actions
          const migrationOutcome = await initPromisePool({
            concurrency: MAX_RULES_TO_UPDATE_IN_PARALLEL,
            items: rules,
            executor: async (rule) => {
              // actions only get fired when rule running, so we should be fine to migrate only enabled
              if (rule.enabled) {
                return migrateRuleActions({
                  rulesClient,
                  savedObjectsClient,
                  rule,
                });
              } else {
                return rule;
              }
            },
            abortSignal: abortController.signal,
          });

          return buildBulkResponse(response, {
            updated: migrationOutcome.results
              .filter(({ result }) => result)
              .map(({ result }) => result),
            errors: [...errors, ...migrationOutcome.errors],
          });
        }

        const fetchRulesOutcome = await fetchRulesByQueryOrIds({
          rulesClient,
          query,
          ids: body.ids,
          abortSignal: abortController.signal,
        });

        const rules = fetchRulesOutcome.results.map(({ result }) => result);
        let bulkActionOutcome: PromisePoolOutcome<RuleAlertType, RuleAlertType | null>;
        let updated: RuleAlertType[] = [];
        let created: RuleAlertType[] = [];
        let deleted: RuleAlertType[] = [];

        switch (body.action) {
          case BulkAction.enable:
            bulkActionOutcome = await initPromisePool({
              concurrency: MAX_RULES_TO_UPDATE_IN_PARALLEL,
              items: rules,
              executor: async (rule) => {
                await validateBulkEnableRule({ mlAuthz, rule });

                // during dry run only validation is getting performed and rule is not saved in ES, thus return early
                if (isDryRun) {
                  return rule;
                }

                const migratedRule = await migrateRuleActions({
                  rulesClient,
                  savedObjectsClient,
                  rule,
                });

                if (!migratedRule.enabled) {
                  await rulesClient.enable({ id: migratedRule.id });
                }

                return {
                  ...migratedRule,
                  enabled: true,
                };
              },
              abortSignal: abortController.signal,
            });
            updated = bulkActionOutcome.results
              .map(({ result }) => result)
              .filter((rule): rule is RuleAlertType => rule !== null);
            break;
          case BulkAction.disable:
            bulkActionOutcome = await initPromisePool({
              concurrency: MAX_RULES_TO_UPDATE_IN_PARALLEL,
              items: rules,
              executor: async (rule) => {
                await validateBulkDisableRule({ mlAuthz, rule });

                // during dry run only validation is getting performed and rule is not saved in ES, thus return early
                if (isDryRun) {
                  return rule;
                }

                const migratedRule = await migrateRuleActions({
                  rulesClient,
                  savedObjectsClient,
                  rule,
                });

                if (migratedRule.enabled) {
                  await rulesClient.disable({ id: migratedRule.id });
                }

                return {
                  ...migratedRule,
                  enabled: false,
                };
              },
              abortSignal: abortController.signal,
            });
            updated = bulkActionOutcome.results
              .map(({ result }) => result)
              .filter((rule): rule is RuleAlertType => rule !== null);
            break;

          case BulkAction.delete:
            bulkActionOutcome = await initPromisePool({
              concurrency: MAX_RULES_TO_UPDATE_IN_PARALLEL,
              items: rules,
              executor: async (rule) => {
                // during dry run return early for delete, as no validations needed for this action
                if (isDryRun) {
                  return null;
                }

                const migratedRule = await migrateRuleActions({
                  rulesClient,
                  savedObjectsClient,
                  rule,
                });

                await deleteRules({
                  ruleId: migratedRule.id,
                  rulesClient,
                  ruleExecutionLog,
                });

                return null;
              },
              abortSignal: abortController.signal,
            });
            deleted = bulkActionOutcome.results
              .map(({ item }) => item)
              .filter((rule): rule is RuleAlertType => rule !== null);
            break;

          case BulkAction.duplicate:
            bulkActionOutcome = await initPromisePool({
              concurrency: MAX_RULES_TO_UPDATE_IN_PARALLEL,
              items: rules,
              executor: async (rule) => {
                await validateBulkDuplicateRule({ mlAuthz, rule });

                // during dry run only validation is getting performed and rule is not saved in ES, thus return early
                if (isDryRun) {
                  return rule;
                }

                const migratedRule = await migrateRuleActions({
                  rulesClient,
                  savedObjectsClient,
                  rule,
                });

                const createdRule = await rulesClient.create({
                  data: duplicateRule(migratedRule),
                });

                return createdRule;
              },
              abortSignal: abortController.signal,
            });
            created = bulkActionOutcome.results
              .map(({ result }) => result)
              .filter((rule): rule is RuleAlertType => rule !== null);
            break;

          case BulkAction.export:
            const exported = await getExportByObjectIds(
              rulesClient,
              exceptionsClient,
              savedObjectsClient,
              rules.map(({ params }) => ({ rule_id: params.ruleId })),
              logger
            );

            const responseBody = `${exported.rulesNdjson}${exported.exceptionLists}${exported.exportDetails}`;

            return response.ok({
              headers: {
                'Content-Disposition': `attachment; filename="rules_export.ndjson"`,
                'Content-Type': 'application/ndjson',
              },
              body: responseBody,
            });

          // will be processed only when isDryRun === true
          // during dry run only validation is getting performed and rule is not saved in ES
          case BulkAction.edit:
            bulkActionOutcome = await initPromisePool({
              concurrency: MAX_RULES_TO_UPDATE_IN_PARALLEL,
              items: rules,
              executor: async (rule) => {
                await dryRunValidateBulkEditRule({ mlAuthz, rule, edit: body.edit });

                return rule;
              },
              abortSignal: abortController.signal,
            });
            updated = bulkActionOutcome.results
              .map(({ result }) => result)
              .filter((rule): rule is RuleAlertType => rule !== null);
        }

        if (abortController.signal.aborted === true) {
          throw new AbortError('Bulk action was aborted');
        }

        return buildBulkResponse(response, {
          updated,
          deleted,
          created,
          errors: [...fetchRulesOutcome.errors, ...bulkActionOutcome.errors],
          isDryRun,
        });
      } catch (err) {
        const error = transformError(err);
        return siemResponse.error({
          body: error.message,
          statusCode: error.statusCode,
        });
      }
    }
  );
};
