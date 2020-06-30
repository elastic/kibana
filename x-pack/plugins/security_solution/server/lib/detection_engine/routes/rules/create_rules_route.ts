/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { createRuleValidateTypeDependents } from '../../../../../common/detection_engine/schemas/request/create_rules_type_dependents';
import { RuleAlertAction } from '../../../../../common/detection_engine/types';
import { buildRouteValidation } from '../../../../utils/build_validation/route_validation';
import {
  createRulesSchema,
  CreateRulesSchemaDecoded,
} from '../../../../../common/detection_engine/schemas/request/create_rules_schema';
import { IRouter } from '../../../../../../../../src/core/server';
import { DETECTION_ENGINE_RULES_URL } from '../../../../../common/constants';
import { SetupPlugins } from '../../../../plugin';
import { buildMlAuthz } from '../../../machine_learning/authz';
import { throwHttpError } from '../../../machine_learning/validation';
import { createRules } from '../../rules/create_rules';
import { readRules } from '../../rules/read_rules';
import { transformValidate } from './validate';
import { getIndexExists } from '../../index/get_index_exists';
import { transformError, buildSiemResponse } from '../utils';
import { updateRulesNotifications } from '../../rules/update_rules_notifications';
import { ruleStatusSavedObjectsClientFactory } from '../../signals/rule_status_saved_objects_client';
import { PartialFilter } from '../../types';

export const createRulesRoute = (router: IRouter, ml: SetupPlugins['ml']): void => {
  router.post(
    {
      path: DETECTION_ENGINE_RULES_URL,
      validate: {
        body: buildRouteValidation<typeof createRulesSchema, CreateRulesSchemaDecoded>(
          createRulesSchema
        ),
      },
      options: {
        tags: ['access:securitySolution'],
      },
    },
    async (context, request, response) => {
      const siemResponse = buildSiemResponse(response);
      const validationErrors = createRuleValidateTypeDependents(request.body);
      if (validationErrors.length) {
        return siemResponse.error({ statusCode: 400, body: validationErrors });
      }
      const {
        actions: actionsRest,
        anomaly_threshold: anomalyThreshold,
        author,
        building_block_type: buildingBlockType,
        description,
        enabled,
        false_positives: falsePositives,
        from,
        query: queryOrUndefined,
        language: languageOrUndefined,
        license,
        output_index: outputIndex,
        saved_id: savedId,
        timeline_id: timelineId,
        timeline_title: timelineTitle,
        meta,
        machine_learning_job_id: machineLearningJobId,
        filters: filtersRest,
        rule_id: ruleId,
        index,
        interval,
        max_signals: maxSignals,
        risk_score: riskScore,
        risk_score_mapping: riskScoreMapping,
        rule_name_override: ruleNameOverride,
        name,
        severity,
        severity_mapping: severityMapping,
        tags,
        threat,
        throttle,
        timestamp_override: timestampOverride,
        to,
        type,
        references,
        note,
        exceptions_list: exceptionsList,
      } = request.body;
      try {
        const query =
          type !== 'machine_learning' && queryOrUndefined == null ? '' : queryOrUndefined;

        const language =
          type !== 'machine_learning' && languageOrUndefined == null
            ? 'kuery'
            : languageOrUndefined;

        // TODO: Fix these either with an is conversion or by better typing them within io-ts
        const actions: RuleAlertAction[] = actionsRest as RuleAlertAction[];
        const filters: PartialFilter[] | undefined = filtersRest as PartialFilter[];

        const alertsClient = context.alerting?.getAlertsClient();
        const clusterClient = context.core.elasticsearch.legacy.client;
        const savedObjectsClient = context.core.savedObjects.client;
        const siemClient = context.securitySolution?.getAppClient();

        if (!siemClient || !alertsClient) {
          return siemResponse.error({ statusCode: 404 });
        }

        const mlAuthz = buildMlAuthz({ license: context.licensing.license, ml, request });
        throwHttpError(await mlAuthz.validateRuleType(type));

        const finalIndex = outputIndex ?? siemClient.getSignalsIndex();
        const indexExists = await getIndexExists(clusterClient.callAsCurrentUser, finalIndex);
        if (!indexExists) {
          return siemResponse.error({
            statusCode: 400,
            body: `To create a rule, the index must exist first. Index ${finalIndex} does not exist`,
          });
        }
        if (ruleId != null) {
          const rule = await readRules({ alertsClient, ruleId, id: undefined });
          if (rule != null) {
            return siemResponse.error({
              statusCode: 409,
              body: `rule_id: "${ruleId}" already exists`,
            });
          }
        }
        const createdRule = await createRules({
          alertsClient,
          anomalyThreshold,
          author,
          buildingBlockType,
          description,
          enabled,
          falsePositives,
          from,
          immutable: false,
          query,
          language,
          license,
          outputIndex: finalIndex,
          savedId,
          timelineId,
          timelineTitle,
          meta,
          machineLearningJobId,
          filters,
          ruleId,
          index,
          interval,
          maxSignals,
          name,
          riskScore,
          riskScoreMapping,
          ruleNameOverride,
          severity,
          severityMapping,
          tags,
          to,
          type,
          threat,
          timestampOverride,
          references,
          note,
          version: 1,
          exceptionsList,
          actions: throttle === 'rule' ? actions : [], // Only enable actions if throttle is rule, otherwise we are a notification and should not enable it,
        });

        const ruleActions = await updateRulesNotifications({
          ruleAlertId: createdRule.id,
          alertsClient,
          savedObjectsClient,
          enabled,
          actions,
          throttle,
          name,
        });

        const ruleStatuses = await ruleStatusSavedObjectsClientFactory(savedObjectsClient).find({
          perPage: 1,
          sortField: 'statusDate',
          sortOrder: 'desc',
          search: `${createdRule.id}`,
          searchFields: ['alertId'],
        });
        const [validated, errors] = transformValidate(
          createdRule,
          ruleActions,
          ruleStatuses.saved_objects[0]
        );
        if (errors != null) {
          return siemResponse.error({ statusCode: 500, body: errors });
        } else {
          return response.ok({ body: validated ?? {} });
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
