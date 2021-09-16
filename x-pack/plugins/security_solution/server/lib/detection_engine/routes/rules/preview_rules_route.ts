/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { transformError } from '@kbn/securitysolution-es-utils';
import { buildRouteValidation } from '../../../../utils/build_validation/route_validation';
import {
  DEFAULT_SEARCH_AFTER_PAGE_SIZE,
  DETECTION_ENGINE_RULES_PREVIEW,
} from '../../../../../common/constants';
import { SetupPlugins } from '../../../../plugin';
import type { SecuritySolutionPluginRouter } from '../../../../types';
import { buildMlAuthz } from '../../../machine_learning/authz';
import { throwHttpError } from '../../../machine_learning/validation';
import { buildSiemResponse } from '../utils';

import { previewRulesSchema } from '../../../../../common/detection_engine/schemas/request';
import { createRuleValidateTypeDependents } from '../../../../../common/detection_engine/schemas/request/create_rules_type_dependents';
import { convertPreviewAPIToInternalSchema } from '../../schemas/rule_converters';
import { previewRuleAlert } from '../../signals/signal_rule_preview_alert_type';
import { wrapHitsFactory } from '../../rule_types/factories';
import { PreviewRuleOptions } from '../../rule_types/types';
import { RuleAlertAction } from '../../../../../common/detection_engine/types';

export const previewRulesRoute = (
  router: SecuritySolutionPluginRouter,
  ml: SetupPlugins['ml'],
  previewRuleOptions: PreviewRuleOptions
): void => {
  router.post(
    {
      path: DETECTION_ENGINE_RULES_PREVIEW,
      validate: {
        body: buildRouteValidation(previewRulesSchema),
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
        const savedObjectsClient = context.core.savedObjects.client;
        const siemClient = context.securitySolution?.getAppClient();

        if (!siemClient /* || !rulesClient*/) {
          return siemResponse.error({ statusCode: 404 });
        }

        const internalRule = convertPreviewAPIToInternalSchema(request.body, siemClient);
        // TODO: where to get the state?
        const state = 'placeholderState';

        const runState = state;
        const { from, maxSignals, meta, ruleId, timestampOverride, to } = internalRule.params;
        const searchAfterSize = Math.min(maxSignals, DEFAULT_SEARCH_AFTER_PAGE_SIZE);

        const mlAuthz = buildMlAuthz({
          license: context.licensing.license,
          ml,
          request,
          savedObjectsClient,
        });
        throwHttpError(await mlAuthz.validateRuleType(internalRule.params.type));

        await context.lists?.getExceptionListClient().createEndpointList();

        const { logger, ignoreFields, mergeStrategy } = previewRuleOptions;

        const wrapHits = wrapHitsFactory({
          logger,
          ignoreFields,
          mergeStrategy,
          spaceId: 'default',
          ruleSO: {
            id: 'preview-rule-id',
            type: 'preview-rule-type',
            references: [],
            attributes: {
              ...internalRule,
              createdBy: 'preview-creator',
              updatedBy: 'preview-updater',
              createdAt: '',
              actions: [] as RuleAlertAction[],
              throttle: '',
            },
          },
        });

        const [previewData, errors] = await previewRuleAlert({
          logger,
          ml,
        }).executor({ params: internalRule, state: null, services: null, spaceId: null });

        if (errors != null) {
          return siemResponse.error({ statusCode: 500, body: errors });
        } else {
          return response.ok({ body: previewData ?? {} });
        }
      } catch (err) {
        const error = transformError(err as Error);
        return siemResponse.error({
          body: error.message,
          statusCode: error.statusCode,
        });
      }
    }
  );
};
