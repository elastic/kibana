/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { uniq, defaultsDeep, cloneDeep } from 'lodash';
import type { ESSearchRequest, ESFilter } from '@kbn/es-types';
import { ProcessorEvent } from '@kbn/observability-plugin/common';
import { PROCESSOR_EVENT } from '../../../../../common/es_fields/apm';
import { ApmIndicesConfig } from '../../../../routes/settings/apm_indices/get_apm_indices';

const processorEventIndexMap = {
  [ProcessorEvent.transaction]: 'transaction',
  [ProcessorEvent.span]: 'span',
  [ProcessorEvent.metric]: 'metric',
  [ProcessorEvent.error]: 'error',
} as const;

export function processorEventsToIndex(
  events: ProcessorEvent[],
  indices: ApmIndicesConfig
) {
  return uniq(events.map((event) => indices[processorEventIndexMap[event]]));
}

export function unpackProcessorEvents(
  request: {
    apm: {
      events: ProcessorEvent[];
    };
  },
  indices: ApmIndicesConfig
) {
  const { apm, ...params } = request;
  const events = uniq(apm.events);
  const index = processorEventsToIndex(events, indices);

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
