/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { uniq, defaultsDeep, cloneDeep } from 'lodash';
import { PROCESSOR_EVENT } from '../../../../../common/elasticsearch_fieldnames';
import { ProcessorEvent } from '../../../../../common/processor_event';
import {
  ESSearchRequest,
  ESFilter,
} from '../../../../../../../typings/elasticsearch';
import { APMEventESSearchRequest } from '.';
import {
  ApmIndicesConfig,
  ApmIndicesName,
} from '../../../settings/apm_indices/get_apm_indices';

export const processorEventIndexMap: Record<ProcessorEvent, ApmIndicesName> = {
  [ProcessorEvent.transaction]: 'apm_oss.transactionIndices',
  [ProcessorEvent.span]: 'apm_oss.spanIndices',
  [ProcessorEvent.metric]: 'apm_oss.metricsIndices',
  [ProcessorEvent.error]: 'apm_oss.errorIndices',
  [ProcessorEvent.sourcemap]: 'apm_oss.sourcemapIndices',
  [ProcessorEvent.onboarding]: 'apm_oss.onboardingIndices',
};

export function unpackProcessorEvents(
  request: APMEventESSearchRequest,
  indices: ApmIndicesConfig
) {
  const { apm, ...params } = request;

  const events = uniq(apm.events);

  const index = events.map((event) => indices[processorEventIndexMap[event]]);

  const withFilterForProcessorEvent: ESSearchRequest & {
    body: { query: { bool: { filter: ESFilter[] } } };
  } = defaultsDeep(cloneDeep(params), {
    body: {
      query: {
        bool: {
          filter: [],
        },
      },
    },
  });

  withFilterForProcessorEvent.body.query.bool.filter.push({
    terms: {
      [PROCESSOR_EVENT]: events,
    },
  });

  return {
    index,
    ...withFilterForProcessorEvent,
  };
}
