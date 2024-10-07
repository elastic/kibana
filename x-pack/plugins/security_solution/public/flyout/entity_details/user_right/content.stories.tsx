/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiFlyout } from '@elastic/eui';
import { TestProvider } from '@kbn/expandable-flyout/src/test/provider';
import { StorybookProviders } from '../../../common/mock/storybook_providers';
import { mockRiskScoreState } from '../../shared/mocks';
import { mockManagedUserData, mockObservedUser } from './mocks';
import { UserPanelContent } from './content';

const riskScoreData = { ...mockRiskScoreState, data: [] };

export default {
  title: 'Components/UserPanelContent',

  decorators: [
    (storyFn) => (
      <StorybookProviders>
        <TestProvider>
          <EuiFlyout size="m" onClose={() => {}}>
            {storyFn()}
          </EuiFlyout>
        </TestProvider>
      </StorybookProviders>
    ),
  ],
};

export const Default = () => (
  <UserPanelContent
    managedUser={mockManagedUserData}
    observedUser={mockObservedUser}
    riskScoreState={riskScoreData}
    contextID={'test-user-details'}
    scopeId={'test-scopeId'}
    isDraggable={false}
    openDetailsPanel={() => {}}
    userName={'test-user-name'}
    onAssetCriticalityChange={() => {}}
    recalculatingScore={false}
  />
);

Default.story = {
  name: 'default',
};

export const IntegrationDisabled = () => (
  <UserPanelContent
    managedUser={{
      data: undefined,
      isLoading: false,
      isIntegrationEnabled: false,
    }}
    observedUser={mockObservedUser}
    riskScoreState={riskScoreData}
    contextID={'test-user-details'}
    scopeId={'test-scopeId'}
    isDraggable={false}
    openDetailsPanel={() => {}}
    userName={'test-user-name'}
    onAssetCriticalityChange={() => {}}
    recalculatingScore={false}
  />
);

IntegrationDisabled.story = {
  name: 'integration disabled',
};

export const NoManagedData = () => (
  <UserPanelContent
    managedUser={{
      data: undefined,
      isLoading: false,
      isIntegrationEnabled: true,
    }}
    observedUser={mockObservedUser}
    riskScoreState={riskScoreData}
    contextID={'test-user-details'}
    scopeId={'test-scopeId'}
    isDraggable={false}
    openDetailsPanel={() => {}}
    userName={'test-user-name'}
    onAssetCriticalityChange={() => {}}
    recalculatingScore={false}
  />
);

NoManagedData.story = {
  name: 'no managed data',
};

export const NoObservedData = () => (
  <UserPanelContent
    managedUser={mockManagedUserData}
    observedUser={{
      details: {
        user: {
          id: [],
          domain: [],
        },
        host: {
          ip: [],
          os: {
            name: [],
            family: [],
          },
        },
      },
      isLoading: false,
      firstSeen: {
        isLoading: false,
        date: undefined,
      },
      lastSeen: {
        isLoading: false,
        date: undefined,
      },
      anomalies: { isLoading: false, anomalies: null, jobNameById: {} },
    }}
    riskScoreState={riskScoreData}
    contextID={'test-user-details'}
    scopeId={'test-scopeId'}
    isDraggable={false}
    openDetailsPanel={() => {}}
    userName={'test-user-name'}
    onAssetCriticalityChange={() => {}}
    recalculatingScore={false}
  />
);

NoObservedData.story = {
  name: 'no observed data',
};

export const Loading = () => (
  <UserPanelContent
    managedUser={{
      data: undefined,
      isLoading: true,
      isIntegrationEnabled: true,
    }}
    observedUser={{
      details: {
        user: {
          id: [],
          domain: [],
        },
        host: {
          ip: [],
          os: {
            name: [],
            family: [],
          },
        },
      },
      isLoading: true,
      firstSeen: {
        isLoading: true,
        date: undefined,
      },
      lastSeen: {
        isLoading: true,
        date: undefined,
      },
      anomalies: { isLoading: true, anomalies: null, jobNameById: {} },
    }}
    riskScoreState={riskScoreData}
    contextID={'test-user-details'}
    scopeId={'test-scopeId'}
    isDraggable={false}
    openDetailsPanel={() => {}}
    userName={'test-user-name'}
    onAssetCriticalityChange={() => {}}
    recalculatingScore={false}
  />
);

Loading.story = {
  name: 'loading',
};
