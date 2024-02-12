/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ESFilter } from '@kbn/es-types';
import type { APMIndices } from '@kbn/apm-data-access-plugin/server';
import { ProcessorEvent } from '@kbn/observability-plugin/common';
import { uniq } from 'lodash';
import { ApmDataSource } from '../../../../../common/data_source';
import { PROCESSOR_EVENT } from '../../../../../common/es_fields/apm';
import {
  getConfigForDocumentType,
  getProcessorEventForDocumentType,
} from '../document_type';

const processorEventIndexMap = {
  [ProcessorEvent.transaction]: 'transaction',
  [ProcessorEvent.span]: 'span',
  [ProcessorEvent.metric]: 'metric',
  [ProcessorEvent.error]: 'error',
} as const;

export function processorEventsToIndex(
  events: ProcessorEvent[],
  indices: APMIndices
) {
  return uniq(
    events.flatMap((event) =>
      indices[processorEventIndexMap[event]].split(',').map((str) => str.trim())
    )
  );
}

export function getRequestBase(options: {
  apm: { events: ProcessorEvent[] } | { sources: ApmDataSource[] };
  indices: APMIndices;
}) {
  const events =
    'events' in options.apm
      ? options.apm.events
      : options.apm.sources.map((source) =>
          getProcessorEventForDocumentType(source.documentType)
        );

  const index = processorEventsToIndex(events, options.indices);

  const filters: ESFilter[] = [
    {
      terms: {
        [PROCESSOR_EVENT]: events,
      },
    },
  ];

  if ('sources' in options.apm) {
    options.apm.sources.forEach((source) => {
      const documentTypeConfig = getConfigForDocumentType(source.documentType);
      if ('getQuery' in documentTypeConfig) {
        filters.push(documentTypeConfig.getQuery(source.rollupInterval));
      }
    });
  }

  return {
    index,
    events,
    filters,
  };
}
