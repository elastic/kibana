/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiTabbedContent, EuiLoadingSpinner } from '@elastic/eui';
import React from 'react';
import { useApmServiceContext } from '../../../../context/apm_service/use_apm_service_context';
import { useApmParams } from '../../../../hooks/use_apm_params';
import { useTimeRange } from '../../../../hooks/use_time_range';
import { FETCH_STATUS, useFetcher } from '../../../../hooks/use_fetcher';
import { EmptyPrompt } from './empty_prompt';
import { FailurePrompt } from './failure_prompt';
import { useTabs } from './use_tabs';

const INITIAL_STATE = {
  containerIds: [],
  hostNames: [],
  podNames: [],
};

export function InfraTabs() {
  const { serviceName } = useApmServiceContext();
  const {
    query: { environment, kuery, rangeFrom, rangeTo },
  } = useApmParams('/services/{serviceName}/infrastructure');
  const { start, end } = useTimeRange({ rangeFrom, rangeTo });

  const { data = INITIAL_STATE, status } = useFetcher(
    (callApmApi) => {
      if (start && end) {
        return callApmApi(
          'GET /internal/apm/services/{serviceName}/infrastructure_attributes',
          {
            params: {
              path: { serviceName },
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
    [environment, kuery, serviceName, start, end]
  );

  const { containerIds, podNames, hostNames } = data;

  const tabs = useTabs({
    containerIds,
    podNames,
    hostNames,
    start,
    end,
  });

  if (status === FETCH_STATUS.LOADING) {
    return (
      <div style={{ textAlign: 'center' }}>
        <EuiLoadingSpinner size="xl" />
      </div>
    );
  }

  if (status === FETCH_STATUS.FAILURE) {
    return (
      <div style={{ textAlign: 'center' }}>
        <FailurePrompt />
      </div>
    );
  }

  if (
    status === FETCH_STATUS.SUCCESS &&
    !containerIds.length &&
    !podNames.length &&
    !hostNames.length
  ) {
    return (
      <div style={{ textAlign: 'center' }}>
        <EmptyPrompt />
      </div>
    );
  }

  return (
    <>
      <EuiTabbedContent
        tabs={tabs}
        initialSelectedTab={tabs[0]}
        autoFocus="selected"
      />
    </>
  );
}
