/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { rulesBulkSchema } from '../../../../../common/detection_engine/schemas/response/rules_bulk_schema';
import { IRouter } from '../../../../../../../../src/core/server';
import { DETECTION_ENGINE_RULES_URL } from '../../../../../common/constants';
import { SetupPlugins } from '../../../../plugin';
import { buildMlAuthz } from '../../../machine_learning/authz';
import { throwHttpError } from '../../../machine_learning/validation';
import { PatchRuleAlertParamsRest } from '../../rules/types';
import { transformBulkError, buildRouteValidation, buildSiemResponse } from '../utils';
import { getIdBulkError } from './utils';
import { transformValidateBulkError, validate } from './validate';
import { patchRulesBulkSchema } from '../schemas/patch_rules_bulk_schema';
import { patchRules } from '../../rules/patch_rules';
import { updateRulesNotifications } from '../../rules/update_rules_notifications';
import { ruleStatusSavedObjectsClientFactory } from '../../signals/rule_status_saved_objects_client';
import { readRules } from '../../rules/read_rules';

export const patchRulesBulkRoute = (router: IRouter, ml: SetupPlugins['ml']) => {
  router.patch(
    {
      path: `${DETECTION_ENGINE_RULES_URL}/_bulk_update`,
      validate: {
        body: buildRouteValidation<PatchRuleAlertParamsRest[]>(patchRulesBulkSchema),
      },
      options: {
        tags: ['access:securitySolution'],
      },
    },
    async (context, request, response) => {
      const siemResponse = buildSiemResponse(response);

      const alertsClient = context.alerting?.getAlertsClient();
      const savedObjectsClient = context.core.savedObjects.client;

      if (!alertsClient) {
        return siemResponse.error({ statusCode: 404 });
      }

      const mlAuthz = buildMlAuthz({ license: context.licensing.license, ml, request });
      const ruleStatusClient = ruleStatusSavedObjectsClientFactory(savedObjectsClient);
      const rules = await Promise.all(
        request.body.map(async (payloadRule) => {
          const {
            actions,
            description,
            enabled,
            false_positives: falsePositives,
            from,
            query,
            language,
            output_index: outputIndex,
            saved_id: savedId,
            timeline_id: timelineId,
            timeline_title: timelineTitle,
            meta,
            filters,
            rule_id: ruleId,
            id,
            index,
            interval,
            max_signals: maxSignals,
            risk_score: riskScore,
            name,
            severity,
            tags,
            to,
            type,
            threat,
            throttle,
            references,
            note,
            version,
            anomaly_threshold: anomalyThreshold,
            machine_learning_job_id: machineLearningJobId,
          } = payloadRule;
          const idOrRuleIdOrUnknown = id ?? ruleId ?? '(unknown id)';
          try {
            if (type) {
              // reject an unauthorized "promotion" to ML
              throwHttpError(await mlAuthz.validateRuleType(type));
            }

            const existingRule = await readRules({ alertsClient, ruleId, id });
            if (existingRule?.params.type) {
              // reject an unauthorized modification of an ML rule
              throwHttpError(await mlAuthz.validateRuleType(existingRule?.params.type));
            }

            const rule = await patchRules({
              rule: existingRule,
              alertsClient,
              description,
              enabled,
              falsePositives,
              from,
              query,
              language,
              outputIndex,
              savedId,
              savedObjectsClient,
              timelineId,
              timelineTitle,
              meta,
              filters,
              index,
              interval,
              maxSignals,
              riskScore,
              name,
              severity,
              tags,
              to,
              type,
              threat,
              references,
              note,
              version,
              anomalyThreshold,
              machineLearningJobId,
              actions,
            });
            if (rule != null && rule.enabled != null && rule.name != null) {
              const ruleActions = await updateRulesNotifications({
                ruleAlertId: rule.id,
                alertsClient,
                savedObjectsClient,
                enabled: rule.enabled,
                actions,
                throttle,
                name: rule.name,
              });
              const ruleStatuses = await ruleStatusClient.find({
                perPage: 1,
                sortField: 'statusDate',
                sortOrder: 'desc',
                search: rule.id,
                searchFields: ['alertId'],
              });
              return transformValidateBulkError(
                rule.id,
                rule,
                ruleActions,
                ruleStatuses.saved_objects[0]
              );
            } else {
              return getIdBulkError({ id, ruleId });
            }
          } catch (err) {
            return transformBulkError(idOrRuleIdOrUnknown, err);
          }
        })
      );

      const [validated, errors] = validate(rules, rulesBulkSchema);
      if (errors != null) {
        return siemResponse.error({ statusCode: 500, body: errors });
      } else {
        return response.ok({ body: validated ?? {} });
      }
    }
  );
};
