/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { EuiLoadingSpinner } from '@elastic/eui';
import React from 'react';
import { useHistory } from 'react-router-dom';
import { fromQuery, toQuery } from '../../../shared/links/url_helpers';
import { useAnyOfApmParams } from '../../../../hooks/use_apm_params';
import {
  FETCH_STATUS,
  isPending,
  useFetcher,
} from '../../../../hooks/use_fetcher';
import { useTimeRange } from '../../../../hooks/use_time_range';
import { useApmServiceContext } from '../../../../context/apm_service/use_apm_service_context';
import { ErrorSampleDetails } from './error_sample_detail';

interface Props {
  errorSampleIds: string[];
  errorSamplesFetchStatus: FETCH_STATUS;
  occurrencesCount: number;
}

export function ErrorSampler({
  errorSampleIds,
  errorSamplesFetchStatus,
  occurrencesCount,
}: Props) {
  const history = useHistory();

  const { serviceName } = useApmServiceContext();

  const {
    path: { groupId },
    query,
  } = useAnyOfApmParams(
    '/services/{serviceName}/errors/{groupId}',
    '/mobile-services/{serviceName}/errors-and-crashes/errors/{groupId}',
    '/mobile-services/{serviceName}/errors-and-crashes/crashes/{groupId}'
  );

  const { rangeFrom, rangeTo, environment, kuery, errorId } = query;

  const { start, end } = useTimeRange({ rangeFrom, rangeTo });

  const { data: errorData, status: errorFetchStatus } = useFetcher(
    (callApmApi) => {
      if (start && end && errorId) {
        return callApmApi(
          'GET /internal/apm/services/{serviceName}/errors/{groupId}/error/{errorId}',
          {
            params: {
              path: {
                serviceName,
                groupId,
                errorId,
              },
              query: {
                environment,
                kuery,
                start,
                end,
              },
            },
          }
        );
      }
    },
    [environment, kuery, serviceName, start, end, groupId, errorId]
  );
  const onSampleClick = (sample: string) => {
    history.push({
      ...history.location,
      search: fromQuery({
        ...toQuery(history.location.search),
        errorId: sample,
      }),
    });
  };
  const loadingErrorSamplesData = isPending(errorSamplesFetchStatus);

  if (loadingErrorSamplesData || !errorData) {
    return (
      <div style={{ textAlign: 'center' }}>
        <EuiLoadingSpinner size="xl" />
      </div>
    );
  }

  return (
    <ErrorSampleDetails
      onSampleClick={onSampleClick}
      errorSampleIds={errorSampleIds}
      errorSamplesFetchStatus={errorSamplesFetchStatus}
      errorData={errorData}
      errorFetchStatus={errorFetchStatus}
      occurrencesCount={occurrencesCount}
    />
  );
}
