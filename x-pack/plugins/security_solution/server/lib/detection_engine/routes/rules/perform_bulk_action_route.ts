/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { transformError } from '@kbn/securitysolution-es-utils';
import { Logger } from 'src/core/server';

import { RuleAlertType as Rule } from '../../rules/types';

import { DETECTION_ENGINE_RULES_BULK_ACTION } from '../../../../../common/constants';
import { BulkAction } from '../../../../../common/detection_engine/schemas/common/schemas';
import { performBulkActionSchema } from '../../../../../common/detection_engine/schemas/request/perform_bulk_action_schema';
import { SetupPlugins } from '../../../../plugin';
import type { SecuritySolutionPluginRouter } from '../../../../types';
import { buildRouteValidation } from '../../../../utils/build_validation/route_validation';
import { initPromisePool } from '../../../../utils/promises_pool';
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

const MAX_RULES_TO_PROCESS_TOTAL = 10000;
const MAX_RULES_TO_PROCESS_IN_PARALLEL = 50;

type RuleActionFn = (rule: Rule) => Promise<void>;

type RuleActionSuccess = undefined;

type RuleActionResult = RuleActionSuccess | RuleActionError;

interface RuleActionError {
  error: {
    message: string;
    statusCode: number;
  };
  rule: {
    id: string;
    name: string;
  };
}

const executeActionAndHandleErrors = async (
  rule: Rule,
  action: RuleActionFn
): Promise<RuleActionResult> => {
  try {
    await action(rule);
  } catch (err) {
    const { message, statusCode } = transformError(err);
    return {
      error: { message, statusCode },
      rule: { id: rule.id, name: rule.name },
    };
  }
};

const executeBulkAction = async (rules: Rule[], action: RuleActionFn) =>
  initPromisePool({
    concurrency: MAX_RULES_TO_PROCESS_IN_PARALLEL,
    items: rules,
    executor: async (rule) => executeActionAndHandleErrors(rule, action),
  });

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
          perPage: MAX_RULES_TO_PROCESS_TOTAL,
          filter: body.query !== '' ? body.query : undefined,
          page: undefined,
          sortField: undefined,
          sortOrder: undefined,
          fields: undefined,
        });

        if (rules.total > MAX_RULES_TO_PROCESS_TOTAL) {
          return siemResponse.error({
            body: `More than ${MAX_RULES_TO_PROCESS_TOTAL} rules matched the filter query. Try to narrow it down.`,
            statusCode: 400,
          });
        }

        let processingResponse: {
          results: RuleActionResult[];
        } = {
          results: [],
        };
        switch (body.action) {
          case BulkAction.enable:
            processingResponse = await executeBulkAction(rules.data, async (rule) => {
              if (!rule.enabled) {
                throwHttpError(await mlAuthz.validateRuleType(rule.params.type));
                await enableRule({
                  rule,
                  rulesClient,
                });
              }
            });
            break;
          case BulkAction.disable:
            processingResponse = await executeBulkAction(rules.data, async (rule) => {
              if (rule.enabled) {
                throwHttpError(await mlAuthz.validateRuleType(rule.params.type));
                await rulesClient.disable({ id: rule.id });
              }
            });
            break;
          case BulkAction.delete:
            processingResponse = await executeBulkAction(rules.data, async (rule) => {
              await deleteRules({
                ruleId: rule.id,
                rulesClient,
                ruleStatusClient,
              });
            });
            break;
          case BulkAction.duplicate:
            processingResponse = await executeBulkAction(rules.data, async (rule) => {
              throwHttpError(await mlAuthz.validateRuleType(rule.params.type));

              await rulesClient.create({
                data: duplicateRule(rule, isRuleRegistryEnabled),
              });
            });
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
            processingResponse = await executeBulkAction(rules.data, async (rule) => {
              throwHttpError(await mlAuthz.validateRuleType(rule.params.type));

              const updatedRule = body.update.reduce(
                (acc, action) => appplyBulkActionUpdateToRule(acc, action),
                rule
              );

              const { tags, params: { timelineTitle, timelineId } = {} } = updatedRule;
              const index = 'index' in updatedRule.params ? updatedRule.params.index : undefined;

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

        const errors = processingResponse.results.filter(
          (resp): resp is RuleActionError => resp?.error !== undefined
        );
        if (errors.length) {
          return siemResponse.error({
            body: `Failed actions: ${errors.length}. Rules processed: ${rules.data.length}. ${errors
              .map((r) => `'${r.rule.name}': '${r.error.message}'`)
              .join(', ')}`,
            statusCode: 500,
          });
        }

        return response.ok({
          body: {
            success: true,
            rules_count: rules.data.length,
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
