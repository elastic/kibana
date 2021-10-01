/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { uniq, defaultsDeep, cloneDeep } from 'lodash';
import { PROCESSOR_EVENT } from '../../../../../common/elasticsearch_fieldnames';
import { ProcessorEvent } from '../../../../../common/processor_event';
import {
  ESSearchRequest,
  ESFilter,
} from '../../../../../../../../src/core/types/elasticsearch';
import { APMEventESSearchRequest, APMEventESTermsEnumRequest } from '.';
import {
  ApmIndicesConfig,
  ApmIndicesName,
} from '../../../settings/apm_indices/get_apm_indices';

const processorEventIndexMap: Record<ProcessorEvent, ApmIndicesName> = {
  [ProcessorEvent.transaction]: 'xpack.apm.transactionIndices',
  [ProcessorEvent.span]: 'xpack.apm.spanIndices',
  [ProcessorEvent.metric]: 'xpack.apm.metricsIndices',
  [ProcessorEvent.error]: 'xpack.apm.errorIndices',
  // TODO: should have its own config setting
  [ProcessorEvent.profile]: 'xpack.apm.transactionIndices',
};

export function unpackProcessorEvents(
  request: APMEventESSearchRequest | APMEventESTermsEnumRequest,
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
