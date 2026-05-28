/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiLoadingSpinner, EuiTabs, EuiTab } from '@elastic/eui';
import React from 'react';
import { useHistory } from 'react-router-dom';
import { FETCH_STATUS } from '../../../../hooks/use_fetcher';
import { useInfrastructureAttributes } from '../use_infrastructure_attributes';
import { EmptyPrompt } from './empty_prompt';
import { FailurePrompt } from './failure_prompt';
import { InfraTab, useTabs } from './use_tabs';
import { push } from '../../../shared/links/url_helpers';

const infraTabTestSubjects: Record<InfraTab, string> = {
  [InfraTab.containers]: 'apmInfraTabsContainersTab',
  [InfraTab.pods]: 'apmInfraTabsPodsTab',
  [InfraTab.hosts]: 'apmInfraTabsHostsTab',
};

export function InfraTabs() {
  const { agentName, data, detailTab, end, start, status } = useInfrastructureAttributes();
  const history = useHistory();

  const { containerIds, podNames, hostNames } = data;

  const tabs = useTabs({
    containerIds,
    podNames,
    hostNames,
    agentName,
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
              key={id}
              onClick={() => {
                push(history, {
                  query: {
                    detailTab: id,
                  },
                });
              }}
              isSelected={currentTab.id === id}
              id={id}
              data-test-subj={infraTabTestSubjects[id]}
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
