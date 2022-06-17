/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { truncate } from 'lodash';
import moment from 'moment';
import { BadRequestError, transformError } from '@kbn/securitysolution-es-utils';
import { KibanaResponseFactory, Logger, SavedObjectsClientContract } from '@kbn/core/server';

import type { RulesClient, BulkEditError } from '@kbn/alerting-plugin/server';
import { SanitizedRule } from '@kbn/alerting-plugin/common';
import { AbortError } from '@kbn/kibana-utils-plugin/common';
import { RuleAlertType } from '../types';
import pMap from 'p-map'
import {
  DETECTION_ENGINE_RULES_BULK_ACTION,
  MAX_RULES_TO_UPDATE_IN_PARALLEL,
  RULES_TABLE_MAX_PAGE_SIZE,
} from '../../../../../common/constants';
import { BulkAction } from '../../../../../common/detection_engine/schemas/common/schemas';
import { performBulkActionSchema } from '../../../../../common/detection_engine/schemas/request/perform_bulk_action_schema';
import { SetupPlugins } from '../../../../plugin';
import type { SecuritySolutionPluginRouter } from '../../../../types';
import { buildRouteValidation } from '../../../../utils/build_validation/route_validation';
import { routeLimitedConcurrencyTag } from '../../../../utils/route_limited_concurrency_tag';
import {
  initPromisePool,
  PromisePoolError,
  PromisePoolOutcome,
} from '../../../../utils/promise_pool';
import { buildMlAuthz } from '../../../machine_learning/authz';
import { throwAuthzError } from '../../../machine_learning/validation';
import { deleteRules } from '../delete_rules';
import { duplicateRule } from '../duplicate_rule';
import { findRules } from '../find_rules';
import { readRules } from '../read_rules';
import { bulkEditRules } from '../bulk_edit_rules';
import { getExportByObjectIds } from '../get_export_by_object_ids';
import { buildSiemResponse } from '../utils';
import { internalRuleToAPIResponse } from '../../schemas/rule_converters';
import { legacyMigrate } from '../utils';
import { RuleParams } from '../../schemas/rule_schemas';

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
  rules: RuleDetailsInError[];
}

type BulkActionError = PromisePoolError<string> | PromisePoolError<RuleAlertType> | BulkEditError;

export const performBulkActionDryRun = (
  router: SecuritySolutionPluginRouter,
  ml: SetupPlugins['ml'],
  logger: Logger
) =>  {

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
            bulkActionOutcome = await pMap(
              items: rules,
                 async (rule) => {
                    throwAuthzError(await mlAuthz.validateRuleType(rule.params.type));
                    
                return {
                  ...rule,
                  enabled: true,
                };
              },
             );
            updated = bulkActionOutcome.results
              .map(({ result }) => result)
              .filter((rule): rule is RuleAlertType => rule !== null);
            break;
          case BulkAction.disable:
            bulkActionOutcome = await initPromisePool({
              concurrency: MAX_RULES_TO_UPDATE_IN_PARALLEL,
              items: rules,
              executor: async (rule) => {
                const migratedRule = await migrateRuleActions({
                  rulesClient,
                  savedObjectsClient,
                  rule,
                });

                if (migratedRule.enabled) {
                  throwAuthzError(await mlAuthz.validateRuleType(migratedRule.params.type));
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
                const migratedRule = await migrateRuleActions({
                  rulesClient,
                  savedObjectsClient,
                  rule,
                });

                throwAuthzError(await mlAuthz.validateRuleType(migratedRule.params.type));

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
        }

        if (abortController.signal.aborted === true) {
          throw new AbortError('Bulk action was aborted');
        }

        return buildBulkResponse(response, {
          updated,
          deleted,
          created,
          errors: [...fetchRulesOutcome.errors, ...bulkActionOutcome.errors],
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
