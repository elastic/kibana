/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { transformError } from '@kbn/securitysolution-es-utils';
import { ISavedObjectsRepository, SavedObject } from 'kibana/server';
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
import { PreviewRuleOptions } from '../../rule_types/types';
import { AlertAttributes } from '../../signals/types';
import { RuleAlertAction } from '../../../../../common/detection_engine/types';
import {
  Alert,
  AlertInstanceContext,
  AlertTypeParams,
  AlertTypeState,
} from '../../../../../../alerting/common';
import {
  EqlRuleParams,
  InternalRuleCreate,
  MachineLearningRuleParams,
  QueryRuleParams,
  RuleParams,
  ThreatRuleParams,
  ThresholdRuleParams,
} from '../../schemas/rule_schemas';
import {
  createEqlAlertType,
  createIndicatorMatchAlertType,
  createMlAlertType,
  createQueryAlertType,
  createThresholdAlertType,
} from '../../rule_types';
import { AlertTypeExecutor, PersistenceServices } from '../../../../../../rule_registry/server';

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
        const runState = {};

        const { maxSignals } = internalRule.params;
        const searchAfterSize = Math.min(maxSignals, DEFAULT_SEARCH_AFTER_PAGE_SIZE);

        const mlAuthz = buildMlAuthz({
          license: context.licensing.license,
          ml,
          request,
          savedObjectsClient,
        });
        throwHttpError(await mlAuthz.validateRuleType(internalRule.params.type));

        await context.lists?.getExceptionListClient().createEndpointList();

        const mockRuleSO: SavedObject<
          Pick<Alert<RuleParams>, 'createdBy' | 'createdAt' | 'updatedBy'>
        > = {
          id: 'preview_rule_so_id',
          references: [],
          type: 'rule',
          attributes: {
            createdBy: 'elastic_preview',
            createdAt: new Date(),
            updatedBy: 'elastic_preview',
            ...internalRule,
          },
        };

        const mockSavedObjectsClient = {
          get: (ruleId: string) => mockRuleSO,
        } as unknown as ISavedObjectsRepository;

        const { logger, ignoreFields, mergeStrategy } = previewRuleOptions;

        const previewRuleParams = internalRule.params;

        const runExecutors = <T extends RuleParams>(
          executor: AlertTypeExecutor<{}, T, {}, {}>,
          params: T
        ) => {};

        switch (previewRuleParams.type) {
          case 'threat_match':
            runExecutors<ThreatRuleParams>(
              createIndicatorMatchAlertType(previewRuleOptions).executor,
              previewRuleParams
            );
            break;
          case 'eql':
            runExecutors<EqlRuleParams>(
              createEqlAlertType(previewRuleOptions).executor,
              previewRuleParams
            );
            break;
          case 'query':
            runExecutors<QueryRuleParams>(
              createQueryAlertType(previewRuleOptions).executor,
              previewRuleParams
            );
            break;
          case 'threshold':
            runExecutors<ThresholdRuleParams>(
              createThresholdAlertType(previewRuleOptions).executor,
              previewRuleParams
            );
            break;
          case 'machine_learning':
            runExecutors<MachineLearningRuleParams>(
              createMlAlertType(previewRuleOptions).executor,
              previewRuleParams
            );
            break;
          default:
            executor = null;
        }

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
