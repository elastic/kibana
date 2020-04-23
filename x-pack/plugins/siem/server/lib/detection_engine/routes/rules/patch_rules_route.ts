/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { IRouter } from '../../../../../../../../src/core/server';
import { DETECTION_ENGINE_RULES_URL } from '../../../../../common/constants';
import { patchRules } from '../../rules/patch_rules';
import { PatchRuleAlertParamsRest } from '../../rules/types';
import { patchRulesSchema } from '../schemas/patch_rules_schema';
import {
  buildRouteValidation,
  transformError,
  buildSiemResponse,
  validateLicenseForRuleType,
} from '../utils';
import { getIdError } from './utils';
import { transformValidate } from './validate';
import { updateRulesNotifications } from '../../rules/update_rules_notifications';
import { ruleStatusSavedObjectsClientFactory } from '../../signals/rule_status_saved_objects_client';

export const patchRulesRoute = (router: IRouter) => {
  router.patch(
    {
      path: DETECTION_ENGINE_RULES_URL,
      validate: {
        body: buildRouteValidation<PatchRuleAlertParamsRest>(patchRulesSchema),
      },
      options: {
        tags: ['access:siem'],
      },
    },
    async (context, request, response) => {
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
      } = request.body;
      const siemResponse = buildSiemResponse(response);

      try {
        if (type) {
          validateLicenseForRuleType({ license: context.licensing.license, ruleType: type });
        }

        const alertsClient = context.alerting?.getAlertsClient();
        const actionsClient = context.actions?.getActionsClient();
        const savedObjectsClient = context.core.savedObjects.client;

        if (!actionsClient || !alertsClient) {
          return siemResponse.error({ statusCode: 404 });
        }

        const ruleStatusClient = ruleStatusSavedObjectsClientFactory(savedObjectsClient);
        const rule = await patchRules({
          actionsClient,
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
          id,
          ruleId,
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

          const [validated, errors] = transformValidate(
            rule,
            ruleActions,
            ruleStatuses.saved_objects[0]
          );
          if (errors != null) {
            return siemResponse.error({ statusCode: 500, body: errors });
          } else {
            return response.ok({ body: validated ?? {} });
          }
        } else {
          const error = getIdError({ id, ruleId });
          return siemResponse.error({
            body: error.message,
            statusCode: error.statusCode,
          });
        }
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
