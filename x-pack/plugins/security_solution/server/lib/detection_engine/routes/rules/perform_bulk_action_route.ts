/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { transformError } from '@kbn/securitysolution-es-utils';
import { Logger } from 'src/core/server';
import { chunk } from 'lodash';

import { DETECTION_ENGINE_RULES_BULK_ACTION } from '../../../../../common/constants';
import { BulkAction } from '../../../../../common/detection_engine/schemas/common/schemas';
import { performBulkActionSchema } from '../../../../../common/detection_engine/schemas/request/perform_bulk_action_schema';
import { SetupPlugins } from '../../../../plugin';
import type { SecuritySolutionPluginRouter } from '../../../../types';
import { buildRouteValidation } from '../../../../utils/build_validation/route_validation';
import { buildMlAuthz } from '../../../machine_learning/authz';
import { throwHttpError } from '../../../machine_learning/validation';
import { deleteRules } from '../../rules/delete_rules';
import { duplicateRule } from '../../rules/duplicate_rule';
import { enableRule } from '../../rules/enable_rule';
import { findRules } from '../../rules/find_rules';
import { patchRules } from '../../rules/patch_rules';
import { appplyBulkActionUpdateToRule } from '../../rules/bulk_action_update';
import { getExportByObjectIds } from '../../rules/get_export_by_object_ids';
import { buildSiemResponse } from '../utils';
import { transformAlertToRule } from './utils';
import { RuleParams } from '../../schemas/rule_schemas';
import { FindResult } from '../../../../../../alerting/server';

const BULK_ACTION_RULES_LIMIT = 10000;
const BULK_ACTION_RULES_CHUNK = 1024;
interface ActionPerformError {
  error: {
    message: string;
    statusCode: number;
    rule: {
      id: string;
      name: string;
    };
  };
}

type ActionPerform = undefined | ActionPerformError;
// wraps bulk action and catches errors
const actionPerformWrapper = async (
  func: () => Promise<void>,
  rule: FindResult<RuleParams>['data'][number]
): Promise<ActionPerform> => {
  try {
    await func();
  } catch (err) {
    const { message, statusCode } = transformError(err);
    return {
      error: { message, statusCode, rule: { id: rule.id, name: rule.name } },
    };
  }
};

// to avoid large number of concurrent requests, we split request in chunks and run them sequentially
const chunkifyRulesAction = async <T extends FindResult<RuleParams>['data'][number]>(
  rules: T[],
  action: (rule: T) => Promise<void>
): Promise<ActionPerform[]> => {
  const processChunks = async (
    rulesChunks: T[][],
    acc: ActionPerform[]
  ): Promise<ActionPerform[]> => {
    if (rulesChunks.length === 0) {
      return acc;
    }
    const processed = await Promise.all(
      rulesChunks[0].map(async (rule) => actionPerformWrapper(async () => action(rule), rule))
    );

    return processChunks(rulesChunks.slice(1), [...acc, ...processed]);
  };

  return processChunks(chunk(rules, BULK_ACTION_RULES_CHUNK), []);
};

export const performBulkActionRoute = (
  router: SecuritySolutionPluginRouter,
  ml: SetupPlugins['ml'],
  logger: Logger,
  isRuleRegistryEnabled: boolean
) => {
  router.post(
    {
      path: DETECTION_ENGINE_RULES_BULK_ACTION,
      validate: {
        body: buildRouteValidation<typeof performBulkActionSchema>(performBulkActionSchema),
      },
      options: {
        tags: ['access:securitySolution'],
      },
    },
    async (context, request, response) => {
      const { body } = request;
      const siemResponse = buildSiemResponse(response);

      try {
        const rulesClient = context.alerting?.getRulesClient();
        const exceptionsClient = context.lists?.getExceptionListClient();
        const savedObjectsClient = context.core.savedObjects.client;
        const ruleStatusClient = context.securitySolution.getExecutionLogClient();

        const mlAuthz = buildMlAuthz({
          license: context.licensing.license,
          ml,
          request,
          savedObjectsClient,
        });

        if (!rulesClient) {
          return siemResponse.error({ statusCode: 404 });
        }

        const rules = await findRules({
          isRuleRegistryEnabled,
          rulesClient,
          perPage: BULK_ACTION_RULES_LIMIT,
          filter: body.query !== '' ? body.query : undefined,
          page: undefined,
          sortField: undefined,
          sortOrder: undefined,
          fields: undefined,
        });

        if (rules.total > BULK_ACTION_RULES_LIMIT) {
          return siemResponse.error({
            body: `More than ${BULK_ACTION_RULES_LIMIT} rules matched the filter query. Try to narrow it down.`,
            statusCode: 400,
          });
        }

        let processed: Array<undefined | ActionPerformError> = [];
        switch (body.action) {
          case BulkAction.enable:
            await Promise.all(
              rules.data.map(async (rule) => {
                if (!rule.enabled) {
                  throwHttpError(await mlAuthz.validateRuleType(rule.params.type));
                  await enableRule({
                    rule,
                    rulesClient,
                  });
                }
              })
            );
            break;
          case BulkAction.disable:
            await Promise.all(
              rules.data.map(async (rule) => {
                if (rule.enabled) {
                  throwHttpError(await mlAuthz.validateRuleType(rule.params.type));
                  await rulesClient.disable({ id: rule.id });
                }
              })
            );
            break;
          case BulkAction.delete:
            await Promise.all(
              rules.data.map(async (rule) => {
                await deleteRules({
                  ruleId: rule.id,
                  rulesClient,
                  ruleStatusClient,
                });
              })
            );
            break;
          case BulkAction.duplicate:
            await Promise.all(
              rules.data.map(async (rule) => {
                throwHttpError(await mlAuthz.validateRuleType(rule.params.type));

                await rulesClient.create({
                  data: duplicateRule(rule, isRuleRegistryEnabled),
                });
              })
            );
            break;
          case BulkAction.export:
            const exported = await getExportByObjectIds(
              rulesClient,
              exceptionsClient,
              savedObjectsClient,
              rules.data.map(({ params }) => ({ rule_id: params.ruleId })),
              logger,
              isRuleRegistryEnabled
            );

            const responseBody = `${exported.rulesNdjson}${exported.exceptionLists}${exported.exportDetails}`;

            return response.ok({
              headers: {
                'Content-Disposition': `attachment; filename="rules_export.ndjson"`,
                'Content-Type': 'application/ndjson',
              },
              body: responseBody,
            });
          case BulkAction.update:
            processed = await chunkifyRulesAction(rules.data, async (rule) => {
              throwHttpError(await mlAuthz.validateRuleType(rule.params.type));

              const updatedRule = body.updates.reduce(
                (acc, action) => appplyBulkActionUpdateToRule(acc, action),
                transformAlertToRule(rule)
              );

              const {
                tags,
                index,
                timeline_title: timelineTitle,
                timeline_id: timelineId,
              } = updatedRule;

              await patchRules({
                rulesClient,
                rule,
                tags,
                index,
                timelineTitle,
                timelineId,
              });
            });
        }

        const errors = processed.filter((res) => res?.error);
        const failedRulesCount = errors.length;

        return response.ok({
          body: {
            success: failedRulesCount === 0,
            rules_count: rules.data.length,
            ...(failedRulesCount > 0 ? { errors, failed_rules_count: failedRulesCount } : {}),
          },
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
