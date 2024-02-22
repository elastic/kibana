/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { truncate } from 'lodash';
import moment from 'moment';
import { BadRequestError, transformError } from '@kbn/securitysolution-es-utils';
import type { IKibanaResponse, KibanaResponseFactory, Logger } from '@kbn/core/server';

import type { RulesClient, BulkOperationError } from '@kbn/alerting-plugin/server';
import type { BulkActionSkipResult } from '@kbn/alerting-plugin/common';
import { AbortError } from '@kbn/kibana-utils-plugin/common';
import type { RuleAlertType } from '../../../../rule_schema';
import type { BulkActionsDryRunErrCode } from '../../../../../../../common/constants';
import {
  DETECTION_ENGINE_RULES_BULK_ACTION,
  MAX_RULES_TO_UPDATE_IN_PARALLEL,
  RULES_TABLE_MAX_PAGE_SIZE,
} from '../../../../../../../common/constants';
import type {
  BulkEditActionResponse,
  PerformBulkActionResponse,
} from '../../../../../../../common/api/detection_engine/rule_management';
import {
  BulkActionTypeEnum,
  PerformBulkActionRequestBody,
  PerformBulkActionRequestQuery,
} from '../../../../../../../common/api/detection_engine/rule_management';
import type {
  NormalizedRuleError,
  RuleDetailsInError,
  BulkEditActionResults,
  BulkEditActionSummary,
} from '../../../../../../../common/api/detection_engine';
import type { SetupPlugins } from '../../../../../../plugin';
import type { SecuritySolutionPluginRouter } from '../../../../../../types';
import { buildRouteValidationWithZod } from '../../../../../../utils/build_validation/route_validation';
import { routeLimitedConcurrencyTag } from '../../../../../../utils/route_limited_concurrency_tag';
import type { PromisePoolError, PromisePoolOutcome } from '../../../../../../utils/promise_pool';
import { initPromisePool } from '../../../../../../utils/promise_pool';
import { buildMlAuthz } from '../../../../../machine_learning/authz';
import { deleteRules } from '../../../logic/crud/delete_rules';
import { duplicateRule } from '../../../logic/actions/duplicate_rule';
import { duplicateExceptions } from '../../../logic/actions/duplicate_exceptions';
import { findRules } from '../../../logic/search/find_rules';
import { readRules } from '../../../logic/crud/read_rules';
import { getExportByObjectIds } from '../../../logic/export/get_export_by_object_ids';
import { buildSiemResponse } from '../../../../routes/utils';
import { internalRuleToAPIResponse } from '../../../normalization/rule_converters';
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

export type BulkActionError =
  | PromisePoolError<string>
  | PromisePoolError<RuleAlertType>
  | BulkOperationError;

const normalizeErrorResponse = (errors: BulkActionError[]): NormalizedRuleError[] => {
  const errorsMap = new Map<string, NormalizedRuleError>();

  errors.forEach((errorObj) => {
    let message: string;
    let statusCode: number = 500;
    let errorCode: BulkActionsDryRunErrCode | undefined;
    let rule: RuleDetailsInError;
    // transform different error types (PromisePoolError<string> | PromisePoolError<RuleAlertType> | BulkOperationError)
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
    skipped = [],
  }: {
    isDryRun?: boolean;
    errors?: BulkActionError[];
    updated?: RuleAlertType[];
    created?: RuleAlertType[];
    deleted?: RuleAlertType[];
    skipped?: BulkActionSkipResult[];
  }
): IKibanaResponse<BulkEditActionResponse> => {
  const numSucceeded = updated.length + created.length + deleted.length;
  const numSkipped = skipped.length;
  const numFailed = errors.length;

  const summary: BulkEditActionSummary = {
    failed: numFailed,
    succeeded: numSucceeded,
    skipped: numSkipped,
    total: numSucceeded + numFailed + numSkipped,
  };

  // if response is for dry_run, empty lists of rules returned, as rules are not actually updated and stored within ES
  // thus, it's impossible to return reliably updated/duplicated/deleted rules
  const results: BulkEditActionResults = isDryRun
    ? {
        updated: [],
        created: [],
        deleted: [],
        skipped: [],
      }
    : {
        updated: updated.map((rule) => internalRuleToAPIResponse(rule)),
        created: created.map((rule) => internalRuleToAPIResponse(rule)),
        deleted: deleted.map((rule) => internalRuleToAPIResponse(rule)),
        skipped,
      };

  if (numFailed > 0) {
    return response.custom<BulkEditActionResponse>({
      headers: { 'content-type': 'application/json' },
      body: {
        message: summary.succeeded > 0 ? 'Bulk edit partially failed' : 'Bulk edit failed',
        status_code: 500,
        attributes: {
          errors: normalizeErrorResponse(errors),
          results,
          summary,
        },
      },
      statusCode: 500,
    });
  }

  const responseBody: BulkEditActionResponse = {
    success: true,
    rules_count: summary.total,
    attributes: { results, summary },
  };

  return response.ok({ body: responseBody });
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

export const performBulkActionRoute = (
  router: SecuritySolutionPluginRouter,
  ml: SetupPlugins['ml'],
  logger: Logger
) => {
  router.versioned
    .post({
      access: 'public',
      path: DETECTION_ENGINE_RULES_BULK_ACTION,
      options: {
        tags: ['access:securitySolution', routeLimitedConcurrencyTag(MAX_ROUTE_CONCURRENCY)],
        timeout: {
          idleSocket: moment.duration(15, 'minutes').asMilliseconds(),
        },
      },
    })
    .addVersion(
      {
        version: '2023-10-31',
        validate: {
          request: {
            body: buildRouteValidationWithZod(PerformBulkActionRequestBody),
            query: buildRouteValidationWithZod(PerformBulkActionRequestQuery),
          },
        },
      },
      async (context, request, response): Promise<IKibanaResponse<PerformBulkActionResponse>> => {
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

        const isDryRun = request.query.dry_run;

        // dry run is not supported for export, as it doesn't change ES state and has different response format(exported JSON file)
        if (isDryRun && body.action === BulkActionTypeEnum.export) {
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
            'actions',
          ]);

          const rulesClient = ctx.alerting.getRulesClient();
          const exceptionsClient = ctx.lists?.getExceptionListClient();
          const savedObjectsClient = ctx.core.savedObjects.client;
          const actionsClient = (await ctx.actions)?.getActionsClient();

          const { getExporter, getClient } = (await ctx.core).savedObjects;
          const client = getClient({ includedHiddenTypes: ['action'] });

          const exporter = getExporter(client);

          const mlAuthz = buildMlAuthz({
            license: ctx.licensing.license,
            ml,
            request,
            savedObjectsClient,
          });

          const query = body.query !== '' ? body.query : undefined;

          // handling this action before switch statement as bulkEditRules fetch rules within
          // rulesClient method, hence there is no need to use fetchRulesByQueryOrIds utility
          if (body.action === BulkActionTypeEnum.edit && !isDryRun) {
            const { rules, errors, skipped } = await bulkEditRules({
              rulesClient,
              filter: query,
              ids: body.ids,
              actions: body.edit,
              mlAuthz,
            });

            return buildBulkResponse(response, {
              updated: rules,
              skipped,
              errors,
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
            case BulkActionTypeEnum.enable:
              bulkActionOutcome = await initPromisePool({
                concurrency: MAX_RULES_TO_UPDATE_IN_PARALLEL,
                items: rules,
                executor: async (rule) => {
                  await validateBulkEnableRule({ mlAuthz, rule });

                  // during dry run only validation is getting performed and rule is not saved in ES, thus return early
                  if (isDryRun) {
                    return rule;
                  }

                  if (!rule.enabled) {
                    await rulesClient.enable({ id: rule.id });
                  }

                  return {
                    ...rule,
                    enabled: true,
                  };
                },
                abortSignal: abortController.signal,
              });
              updated = bulkActionOutcome.results
                .map(({ result }) => result)
                .filter((rule): rule is RuleAlertType => rule !== null);
              break;
            case BulkActionTypeEnum.disable:
              bulkActionOutcome = await initPromisePool({
                concurrency: MAX_RULES_TO_UPDATE_IN_PARALLEL,
                items: rules,
                executor: async (rule) => {
                  await validateBulkDisableRule({ mlAuthz, rule });

                  // during dry run only validation is getting performed and rule is not saved in ES, thus return early
                  if (isDryRun) {
                    return rule;
                  }

                  if (rule.enabled) {
                    await rulesClient.disable({ id: rule.id });
                  }

                  return {
                    ...rule,
                    enabled: false,
                  };
                },
                abortSignal: abortController.signal,
              });
              updated = bulkActionOutcome.results
                .map(({ result }) => result)
                .filter((rule): rule is RuleAlertType => rule !== null);
              break;

            case BulkActionTypeEnum.delete:
              bulkActionOutcome = await initPromisePool({
                concurrency: MAX_RULES_TO_UPDATE_IN_PARALLEL,
                items: rules,
                executor: async (rule) => {
                  // during dry run return early for delete, as no validations needed for this action
                  if (isDryRun) {
                    return null;
                  }

                  await deleteRules({
                    ruleId: rule.id,
                    rulesClient,
                  });

                  return null;
                },
                abortSignal: abortController.signal,
              });
              deleted = bulkActionOutcome.results
                .map(({ item }) => item)
                .filter((rule): rule is RuleAlertType => rule !== null);
              break;

            case BulkActionTypeEnum.duplicate:
              bulkActionOutcome = await initPromisePool({
                concurrency: MAX_RULES_TO_UPDATE_IN_PARALLEL,
                items: rules,
                executor: async (rule) => {
                  await validateBulkDuplicateRule({ mlAuthz, rule });

                  // during dry run only validation is getting performed and rule is not saved in ES, thus return early
                  if (isDryRun) {
                    return rule;
                  }

                  let shouldDuplicateExceptions = true;
                  let shouldDuplicateExpiredExceptions = true;
                  if (body.duplicate !== undefined) {
                    shouldDuplicateExceptions = body.duplicate.include_exceptions;
                    shouldDuplicateExpiredExceptions = body.duplicate.include_expired_exceptions;
                  }

                  const duplicateRuleToCreate = await duplicateRule({
                    rule,
                  });

                  const createdRule = await rulesClient.create({
                    data: duplicateRuleToCreate,
                  });

                  // we try to create exceptions after rule created, and then update rule
                  const exceptions = shouldDuplicateExceptions
                    ? await duplicateExceptions({
                        ruleId: rule.params.ruleId,
                        exceptionLists: rule.params.exceptionsList,
                        includeExpiredExceptions: shouldDuplicateExpiredExceptions,
                        exceptionsClient,
                      })
                    : [];

                  const updatedRule = await rulesClient.update({
                    id: createdRule.id,
                    data: {
                      ...duplicateRuleToCreate,
                      params: {
                        ...duplicateRuleToCreate.params,
                        exceptionsList: exceptions,
                      },
                    },
                    shouldIncrementRevision: () => false,
                  });

                  // TODO: figureout why types can't return just updatedRule
                  return { ...createdRule, ...updatedRule };
                },
                abortSignal: abortController.signal,
              });
              created = bulkActionOutcome.results
                .map(({ result }) => result)
                .filter((rule): rule is RuleAlertType => rule !== null);
              break;

            case BulkActionTypeEnum.export:
              const exported = await getExportByObjectIds(
                rulesClient,
                exceptionsClient,
                rules.map(({ params }) => params.ruleId),
                exporter,
                request,
                actionsClient
              );

              const responseBody = `${exported.rulesNdjson}${exported.exceptionLists}${exported.actionConnectors}${exported.exportDetails}`;

              return response.ok({
                headers: {
                  'Content-Disposition': `attachment; filename="rules_export.ndjson"`,
                  'Content-Type': 'application/ndjson',
                },
                body: responseBody,
              });

            // will be processed only when isDryRun === true
            // during dry run only validation is getting performed and rule is not saved in ES
            case BulkActionTypeEnum.edit:
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
