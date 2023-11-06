/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { storiesOf } from '@storybook/react';
import { EuiFlyout, EuiFlyoutBody } from '@elastic/eui';
import { ExpandableFlyoutContext } from '@kbn/expandable-flyout/src/context';
import { StorybookProviders } from '../../../common/mock/storybook_providers';
import {
  mockManagedUser,
  mockObservedUser,
  mockRiskScoreState,
} from '../../../timelines/components/side_panel/new_user_detail/__mocks__';
import { UserDetailsContent } from './user_details_content';

const flyoutContextValue = {
  openLeftPanel: () => window.alert('openLeftPanel called'),
  panels: {},
} as unknown as ExpandableFlyoutContext;

storiesOf('Components/UserDetailsContent', module)
  .addDecorator((storyFn) => (
    <StorybookProviders>
      <ExpandableFlyoutContext.Provider value={flyoutContextValue}>
        <EuiFlyout size="m" onClose={() => {}}>
          <EuiFlyoutBody>{storyFn()}</EuiFlyoutBody>
        </EuiFlyout>
      </ExpandableFlyoutContext.Provider>
    </StorybookProviders>
  ))
  .add('default', () => (
    <UserDetailsContent
      userName="test"
      managedUser={mockManagedUser}
      observedUser={mockObservedUser}
      riskScoreState={mockRiskScoreState}
      contextID={'test-user-details'}
      scopeId={'test-scopeId'}
      isDraggable={false}
    />
  ))
  .add('integration disabled', () => (
    <UserDetailsContent
      userName="test"
      managedUser={{
        details: undefined,
        isLoading: false,
        isIntegrationEnabled: false,
        firstSeen: {
          isLoading: false,
          date: undefined,
        },
        lastSeen: {
          isLoading: false,
          date: undefined,
        },
      }}
      observedUser={mockObservedUser}
      riskScoreState={mockRiskScoreState}
      contextID={'test-user-details'}
      scopeId={'test-scopeId'}
      isDraggable={false}
    />
  ))
  .add('no managed data', () => (
    <UserDetailsContent
      userName="test"
      managedUser={{
        details: undefined,
        isLoading: false,
        isIntegrationEnabled: true,
        firstSeen: {
          isLoading: false,
          date: undefined,
        },
        lastSeen: {
          isLoading: false,
          date: undefined,
        },
      }}
      observedUser={mockObservedUser}
      riskScoreState={mockRiskScoreState}
      contextID={'test-user-details'}
      scopeId={'test-scopeId'}
      isDraggable={false}
    />
  ))
  .add('no observed data', () => (
    <UserDetailsContent
      userName="test"
      managedUser={mockManagedUser}
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
      riskScoreState={mockRiskScoreState}
      contextID={'test-user-details'}
      scopeId={'test-scopeId'}
      isDraggable={false}
    />
  ))
  .add('loading', () => (
    <UserDetailsContent
      userName="test"
      managedUser={{
        details: undefined,
        isLoading: true,
        isIntegrationEnabled: true,
        firstSeen: {
          isLoading: true,
          date: undefined,
        },
        lastSeen: {
          isLoading: true,
          date: undefined,
        },
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
      riskScoreState={mockRiskScoreState}
      contextID={'test-user-details'}
      scopeId={'test-scopeId'}
      isDraggable={false}
    />
  ));
