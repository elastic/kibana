/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { transformError } from '@kbn/securitysolution-es-utils';
import { Logger } from 'src/core/server';

import { DETECTION_ENGINE_RULES_BULK_ACTION } from '../../../../../common/constants';
import {
  BulkAction,
  BulkActionUpdateType,
} from '../../../../../common/detection_engine/schemas/common/schemas';
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
import { getExportByObjectIds } from '../../rules/get_export_by_object_ids';
import { buildSiemResponse } from '../utils';
import { transformAlertToRule } from './utils';

const BULK_ACTION_RULES_LIMIT = 10000;

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
            const addItemsToArray = <T>(arr: T[], items: T[]): T[] =>
              Array.from(new Set([...arr, ...items]));

            const deleteItemsFromArray = <T>(arr: T[], items: T[]): T[] => {
              const itemsSet = new Set(items);
              return arr.filter((item) => !itemsSet.has(item));
            };

            await Promise.all(
              rules.data.map(async (existingRule) => {
                const transformedRule = transformAlertToRule(existingRule);

                body?.updates?.map?.((action) => {
                  switch (action.type) {
                    // tags actions
                    case BulkActionUpdateType.add_tags:
                      transformedRule.tags = addItemsToArray(
                        transformedRule.tags ?? [],
                        action.value
                      );
                      break;

                    case BulkActionUpdateType.delete_tags:
                      transformedRule.tags = deleteItemsFromArray(
                        transformedRule.tags ?? [],
                        action.value
                      );
                      break;

                    case BulkActionUpdateType.set_tags:
                      transformedRule.tags = action.value;
                      break;

                    // index actions
                    case BulkActionUpdateType.add_index:
                      transformedRule.index = addItemsToArray(
                        transformedRule.index ?? [],
                        action.value
                      );
                      break;

                    case BulkActionUpdateType.delete_index:
                      transformedRule.index = deleteItemsFromArray(
                        transformedRule.index ?? [],
                        action.value
                      );
                      break;

                    case BulkActionUpdateType.set_index:
                      transformedRule.index = action.value;
                      break;

                    // timeline actions
                    case BulkActionUpdateType.set_timeline:
                      transformedRule.timeline_id = action.value.timelineId;
                      transformedRule.timeline_title = action.value.timelineTitle;
                  }

                  return transformedRule;
                });

                const {
                  tags,
                  index,
                  timeline_title: timelineTitle,
                  timeline_id: timelineId,
                } = transformedRule;

                await patchRules({
                  rulesClient,
                  rule: existingRule,
                  tags,
                  index,
                  timelineTitle,
                  timelineId,
                });
              })
            );
        }

        return response.ok({ body: { success: true, rules_count: rules.data.length, errors: [] } });
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
