/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiLoadingSpinner, EuiTabs, EuiTab } from '@elastic/eui';
import React from 'react';
import { useHistory } from 'react-router-dom';
import { useApmServiceContext } from '../../../../context/apm_service/use_apm_service_context';
import { useApmParams } from '../../../../hooks/use_apm_params';
import { useTimeRange } from '../../../../hooks/use_time_range';
import { FETCH_STATUS, useFetcher } from '../../../../hooks/use_fetcher';
import { EmptyPrompt } from './empty_prompt';
import { FailurePrompt } from './failure_prompt';
import { useTabs } from './use_tabs';
import { push } from '../../../shared/links/url_helpers';

const INITIAL_STATE = {
  containerIds: [],
  hostNames: [],
  podNames: [],
};

export function InfraTabs() {
  const { serviceName } = useApmServiceContext();
  const history = useHistory();
  const {
    query: { environment, kuery, rangeFrom, rangeTo, detailTab },
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

  const currentTab = tabs.find(({ id }) => id === detailTab) ?? tabs[0];

  return (
    <>
      <EuiTabs>
        {tabs.map(({ id, name }) => {
          return (
            <EuiTab
              onClick={() => {
                push(history, {
                  query: {
                    detailTab: id,
                  },
                });
              }}
              isSelected={currentTab.id === id}
              id={id}
            >
              {name}
            </EuiTab>
          );
        })}
      </EuiTabs>
      {currentTab.content}
    </>
  );
}
