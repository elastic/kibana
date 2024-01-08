/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { storiesOf } from '@storybook/react';
import { EuiFlyout } from '@elastic/eui';
import type { ExpandableFlyoutContextValue } from '@kbn/expandable-flyout/src/context';
import { ExpandableFlyoutContext } from '@kbn/expandable-flyout/src/context';
import { StorybookProviders } from '../../../common/mock/storybook_providers';
import {
  mockManagedUserData,
  mockRiskScoreState,
} from '../../../timelines/components/side_panel/new_user_detail/__mocks__';
import { UserPanelContent } from './content';
import { mockObservedUser } from './mocks';

const flyoutContextValue = {
  openLeftPanel: () => window.alert('openLeftPanel called'),
  panels: {},
} as unknown as ExpandableFlyoutContextValue;

const riskScoreData = { ...mockRiskScoreState, data: [] };

storiesOf('Components/UserPanelContent', module)
  .addDecorator((storyFn) => (
    <StorybookProviders>
      <ExpandableFlyoutContext.Provider value={flyoutContextValue}>
        <EuiFlyout size="m" onClose={() => {}}>
          {storyFn()}
        </EuiFlyout>
      </ExpandableFlyoutContext.Provider>
    </StorybookProviders>
  ))
  .add('default', () => (
    <UserPanelContent
      managedUser={mockManagedUserData}
      observedUser={mockObservedUser}
      riskScoreState={riskScoreData}
      contextID={'test-user-details'}
      scopeId={'test-scopeId'}
      isDraggable={false}
      openDetailsPanel={() => {}}
    />
  ))
  .add('integration disabled', () => (
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
    />
  ))
  .add('no managed data', () => (
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
    />
  ))
  .add('no observed data', () => (
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
    />
  ))
  .add('loading', () => (
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
    />
  ));
