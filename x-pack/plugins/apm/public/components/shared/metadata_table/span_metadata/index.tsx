/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo } from 'react';
import { Span } from '../../../../../typings/es_schemas/ui/span';
import { getSectionsFromFields } from '../helper';
import { MetadataTable } from '..';
import { FETCH_STATUS, useFetcher } from '../../../../hooks/use_fetcher';
import { ProcessorEvent } from '../../../../../common/processor_event';

interface Props {
  span: Span;
}

export function SpanMetadata({ span }: Props) {
  const { data: spanEvent, status } = useFetcher(
    (callApmApi) => {
      return callApmApi(
        'GET /internal/apm/event_metadata/{processorEvent}/{id}',
        {
          params: {
            path: {
              processorEvent: ProcessorEvent.span,
              id: span.span.id,
            },
          },
        }
      );
    },
    [span.span.id]
  );

  const sections = useMemo(
    () => getSectionsFromFields(spanEvent?.metadata || {}),
    [spanEvent?.metadata]
  );

  return (
    <MetadataTable
      sections={sections}
      isLoading={status === FETCH_STATUS.LOADING}
    />
  );
}
