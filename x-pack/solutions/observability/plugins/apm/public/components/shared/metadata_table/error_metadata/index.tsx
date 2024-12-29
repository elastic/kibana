/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo } from 'react';
import { ProcessorEvent } from '@kbn/observability-plugin/common';
import { APMError, AT_TIMESTAMP } from '@kbn/apm-types';
import { getSectionsFromFields } from '../helper';
import { MetadataTable } from '..';
import { FETCH_STATUS, useFetcher } from '../../../../hooks/use_fetcher';

interface Props {
  error: {
    [AT_TIMESTAMP]: string;
    error: Pick<APMError['error'], 'id'>;
  };
}

export function ErrorMetadata({ error }: Props) {
  const { data: errorEvent, status } = useFetcher(
    (callApmApi) => {
      return callApmApi('GET /internal/apm/event_metadata/{processorEvent}/{id}', {
        params: {
          path: {
            processorEvent: ProcessorEvent.error,
            id: error.error.id,
          },
          query: {
            start: error[AT_TIMESTAMP],
            end: error[AT_TIMESTAMP],
          },
        },
      });
    },
    [error]
  );

  const sections = useMemo(
    () => getSectionsFromFields(errorEvent?.metadata || {}),
    [errorEvent?.metadata]
  );

  return <MetadataTable sections={sections} isLoading={status === FETCH_STATUS.LOADING} />;
}
