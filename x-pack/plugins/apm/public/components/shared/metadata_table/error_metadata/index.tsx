/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo } from 'react';
import { APMError } from '../../../../../typings/es_schemas/ui/apm_error';
import { getSectionsFromFields } from '../helper';
import { MetadataTable } from '..';
import { FETCH_STATUS, useFetcher } from '../../../../hooks/use_fetcher';
import { ProcessorEvent } from '../../../../../common/processor_event';

interface Props {
  error: APMError;
}

export function ErrorMetadata({ error }: Props) {
  const { data: errorEvent, status } = useFetcher(
    (callApmApi) => {
      return callApmApi(
        'GET /internal/apm/event_metadata/{processorEvent}/{id}',
        {
          params: {
            path: {
              processorEvent: ProcessorEvent.error,
              id: error.error.id,
            },
          },
        }
      );
    },
    [error.error.id]
  );

  const sections = useMemo(
    () => getSectionsFromFields(errorEvent?.metadata || {}),
    [errorEvent?.metadata]
  );

  return (
    <MetadataTable
      sections={sections}
      isLoading={status === FETCH_STATUS.LOADING}
    />
  );
}
