/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  CoreStart,
  KibanaRequest,
  RequestHandlerContext,
  RequestHandler,
  KibanaResponseFactory,
} from '@kbn/core/server';
import { createExecutionContext } from '@kbn/ml-route-utils';
import type { UsageCounter } from '@kbn/usage-collection-plugin/server';
import { AIOPS_TELEMETRY_ID, AIOPS_PLUGIN_ID } from '@kbn/aiops-common/constants';
import type {
  AiopsLogRateAnalysisSchema,
  AiopsLogRateAnalysisApiVersion as ApiVersion,
} from '@kbn/aiops-log-rate-analysis/api/schema';
import {
  containsECSIdentifierFields,
  filterByECSFields,
} from '@kbn/aiops-log-rate-analysis/ecs_fields';

import { AIOPS_API_ENDPOINT } from '@kbn/aiops-common/constants';
import {
  SUPPORTED_ES_FIELD_TYPES,
  SUPPORTED_ES_FIELD_TYPES_TEXT,
  TEXT_FIELD_WHITE_LIST,
} from '@kbn/aiops-log-rate-analysis/queries/fetch_index_info';
import type { ES_FIELD_TYPES } from '@kbn/field-types';

import { trackAIOpsRouteUsage } from '../../lib/track_route_usage';
import type { AiopsLicense } from '../../types';

/**
 * The index info route handler return fields suitable for log rate analysis.
 */
export function routeHandlerFactory<T extends ApiVersion>(
  version: '1',
  license: AiopsLicense,
  coreStart: CoreStart,
  usageCounter?: UsageCounter
): RequestHandler<unknown, unknown, AiopsLogRateAnalysisSchema<T>> {
  return async (
    context: RequestHandlerContext,
    request: KibanaRequest<unknown, unknown, AiopsLogRateAnalysisSchema<T>>,
    response: KibanaResponseFactory
  ) => {
    const { body, events, headers } = request;

    trackAIOpsRouteUsage(
      `POST ${AIOPS_API_ENDPOINT.LOG_RATE_ANALYSIS_FIELD_CANDIDATES}`,
      headers[AIOPS_TELEMETRY_ID.AIOPS_ANALYSIS_RUN_ORIGIN],
      usageCounter
    );

    if (!license.isActivePlatinumLicense) {
      return response.forbidden();
    }

    const esClient = (await context.core).elasticsearch.client.asCurrentUser;
    const executionContext = createExecutionContext(coreStart, AIOPS_PLUGIN_ID, request.route.path);

    return await coreStart.executionContext.withContext(executionContext, async () => {
      const controller = new AbortController();
      const abortSignal = controller.signal;

      events.aborted$.subscribe(() => {
        controller.abort();
      });
      events.completed$.subscribe(() => {
        controller.abort();
      });

      const textFieldCandidatesOverrides = TEXT_FIELD_WHITE_LIST;

      try {
        // Get all supported fields
        const respMapping = await esClient.fieldCaps(
          {
            fields: '*',
            filters: '-metadata,-parent',
            include_empty_fields: false,
            index: body.index,
            index_filter: {
              range: {
                [body.timeFieldName]: {
                  gte: body.deviationMin,
                  lte: body.deviationMax,
                },
              },
            },
            types: [...SUPPORTED_ES_FIELD_TYPES, ...SUPPORTED_ES_FIELD_TYPES_TEXT],
          },
          { signal: abortSignal, maxRetries: 0 }
        );

        const allFieldNames: string[] = [];

        const acceptableFields: Set<string> = new Set();
        const acceptableTextFields: Set<string> = new Set();

        Object.entries(respMapping.fields).forEach(([key, value]) => {
          const fieldTypes = Object.keys(value) as ES_FIELD_TYPES[];
          const isSupportedType = fieldTypes.some((type) =>
            SUPPORTED_ES_FIELD_TYPES.includes(type)
          );
          const isAggregatable = fieldTypes.some((type) => value[type].aggregatable);
          const isTextField = fieldTypes.some((type) =>
            SUPPORTED_ES_FIELD_TYPES_TEXT.includes(type)
          );

          // Check if fieldName is something we can aggregate on
          if (isSupportedType && isAggregatable) {
            acceptableFields.add(key);
          }

          if (isTextField && TEXT_FIELD_WHITE_LIST.includes(key)) {
            acceptableTextFields.add(key);
          }

          allFieldNames.push(key);
        });

        const textFieldCandidatesOverridesWithKeywordPostfix = textFieldCandidatesOverrides.map(
          (d) => `${d}.keyword`
        );

        const keywordFieldCandidates: string[] = [...acceptableFields].filter(
          (field) => !textFieldCandidatesOverridesWithKeywordPostfix.includes(field)
        );
        const textFieldCandidates: string[] = [...acceptableTextFields].filter((field) => {
          const fieldName = field.replace(new RegExp(/\.text$/), '');
          return (
            (!keywordFieldCandidates.includes(fieldName) &&
              !keywordFieldCandidates.includes(`${fieldName}.keyword`)) ||
            textFieldCandidatesOverrides.includes(field)
          );
        });

        return response.ok({
          body: {
            // all keyword field candidates
            keywordFieldCandidates: keywordFieldCandidates.sort(),
            // preselection:
            // - if we identify an ECS schema, filter by custom ECS whitelist
            // - if not, take the first 100 fields
            selectedKeywordFieldCandidates: containsECSIdentifierFields(keywordFieldCandidates)
              ? filterByECSFields(keywordFieldCandidates).sort()
              : keywordFieldCandidates.sort().slice(0, 100),
            // text field candidates
            textFieldCandidates: textFieldCandidates.sort(),
            selectedTextFieldCandidates: textFieldCandidates.sort(),
          },
        });
      } catch (e) {
        return response.badRequest();
      }
    });
  };
}
