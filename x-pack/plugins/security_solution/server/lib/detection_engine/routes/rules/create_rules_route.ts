/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

/* eslint-disable complexity */

import uuid from 'uuid';

import { buildRouteValidation } from '../../../../utils/build_validation/route_validation';
import { IRouter } from '../../../../../../../../src/core/server';
import {
  DETECTION_ENGINE_RULES_URL,
  SIGNALS_ID,
  SERVER_APP_ID,
  DEFAULT_MAX_SIGNALS,
} from '../../../../../common/constants';
import { SetupPlugins } from '../../../../plugin';
import { buildMlAuthz } from '../../../machine_learning/authz';
import { throwHttpError } from '../../../machine_learning/validation';
import { readRules } from '../../rules/read_rules';
import { getIndexExists } from '../../index/get_index_exists';
import { transformError, buildSiemResponse } from '../utils';
import { updateRulesNotifications } from '../../rules/update_rules_notifications';
import { ruleStatusSavedObjectsClientFactory } from '../../signals/rule_status_saved_objects_client';
import { addTags } from '../../rules/add_tags';
import { transformRuleToAlertAction } from '../../../../../common/detection_engine/transform_actions';
import { createRulesSchema } from '../../../../../common/detection_engine/schemas/request/rule_schemas';
import { newTransformValidate } from './validate';
import { InternalRuleCreate } from '../../schemas/rule_schemas';
import { typeSpecificSnakeToCamel } from '../../schemas/rule_converters';
import { createRuleValidateTypeDependents } from '../../../../../common/detection_engine/schemas/request/create_rules_type_dependents';

export const createRulesRoute = (router: IRouter, ml: SetupPlugins['ml']): void => {
  router.post(
    {
      path: DETECTION_ENGINE_RULES_URL,
      validate: {
        body: buildRouteValidation(createRulesSchema),
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
      try {
        const alertsClient = context.alerting?.getAlertsClient();
        const clusterClient = context.core.elasticsearch.legacy.client;
        const savedObjectsClient = context.core.savedObjects.client;
        const siemClient = context.securitySolution?.getAppClient();

        if (!siemClient || !alertsClient) {
          return siemResponse.error({ statusCode: 404 });
        }

        if (request.body.rule_id != null) {
          const rule = await readRules({
            alertsClient,
            ruleId: request.body.rule_id,
            id: undefined,
          });
          if (rule != null) {
            return siemResponse.error({
              statusCode: 409,
              body: `rule_id: "${request.body.rule_id}" already exists`,
            });
          }
        }

        const typeSpecificParams = typeSpecificSnakeToCamel(request.body);
        const newRuleId = request.body.rule_id ?? uuid.v4();
        const throttle = request.body.throttle ?? null;
        const internalRule: InternalRuleCreate = {
          name: request.body.name,
          tags: addTags(request.body.tags ?? [], newRuleId, false),
          alertTypeId: SIGNALS_ID,
          consumer: SERVER_APP_ID,
          params: {
            author: request.body.author ?? [],
            buildingBlockType: request.body.building_block_type,
            description: request.body.description,
            ruleId: newRuleId,
            falsePositives: request.body.false_positives ?? [],
            from: request.body.from ?? 'now-6m',
            immutable: false,
            license: request.body.license,
            outputIndex: request.body.output_index ?? siemClient.getSignalsIndex(),
            timelineId: request.body.timeline_id,
            timelineTitle: request.body.timeline_title,
            meta: request.body.meta,
            maxSignals: request.body.max_signals ?? DEFAULT_MAX_SIGNALS,
            riskScore: request.body.risk_score,
            riskScoreMapping: request.body.risk_score_mapping ?? [],
            ruleNameOverride: request.body.rule_name_override,
            severity: request.body.severity,
            severityMapping: request.body.severity_mapping ?? [],
            threat: request.body.threat ?? [],
            timestampOverride: request.body.timestamp_override,
            to: request.body.to ?? 'now',
            references: request.body.references ?? [],
            note: request.body.note,
            version: request.body.version ?? 1,
            exceptionsList: request.body.exceptions_list ?? [],
            ...typeSpecificParams,
          },
          schedule: { interval: request.body.interval ?? '5m' },
          enabled: request.body.enabled ?? true,
          actions:
            throttle === 'rule' ? (request.body.actions ?? []).map(transformRuleToAlertAction) : [],
          throttle: null,
        };

        const mlAuthz = buildMlAuthz({
          license: context.licensing.license,
          ml,
          request,
          savedObjectsClient,
        });
        throwHttpError(await mlAuthz.validateRuleType(internalRule.params.type));

        const indexExists = await getIndexExists(
          clusterClient.callAsCurrentUser,
          internalRule.params.outputIndex
        );
        if (!indexExists) {
          return siemResponse.error({
            statusCode: 400,
            body: `To create a rule, the index must exist first. Index ${internalRule.params.outputIndex} does not exist`,
          });
        }

        // This will create the endpoint list if it does not exist yet
        await context.lists?.getExceptionListClient().createEndpointList();

        const createdRule = await alertsClient.create({
          data: internalRule,
        });

        const ruleActions = await updateRulesNotifications({
          ruleAlertId: createdRule.id,
          alertsClient,
          savedObjectsClient,
          enabled: createdRule.enabled,
          actions: request.body.actions,
          throttle,
          name: createdRule.name,
        });

        const ruleStatuses = await ruleStatusSavedObjectsClientFactory(savedObjectsClient).find({
          perPage: 1,
          sortField: 'statusDate',
          sortOrder: 'desc',
          search: `${createdRule.id}`,
          searchFields: ['alertId'],
        });
        const [validated, errors] = newTransformValidate(
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
