/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { storiesOf } from '@storybook/react';
import { EuiFlyout, EuiFlyoutBody } from '@elastic/eui';
import { UserDetailsContentComponent } from './user_details_content';
import { StorybookProviders } from '../../../../common/mock/storybook_providers';
import { mockManagedUser, mockObservedUser, mockRiskScoreState } from './__mocks__';

storiesOf('UserDetailsContent', module)
  .addDecorator((storyFn) => (
    <StorybookProviders>
      <EuiFlyout size="m" onClose={() => {}}>
        <EuiFlyoutBody>{storyFn()}</EuiFlyoutBody>
      </EuiFlyout>
    </StorybookProviders>
  ))
  .add('default', () => (
    <UserDetailsContentComponent
      userName="test"
      managedUser={mockManagedUser}
      observedUser={mockObservedUser}
      riskScoreState={mockRiskScoreState}
      contextID={'test-user-details'}
      isDraggable={false}
    />
  ))
  .add('integration disabled', () => (
    <UserDetailsContentComponent
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
      isDraggable={false}
    />
  ))
  .add('no managed data', () => (
    <UserDetailsContentComponent
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
      isDraggable={false}
    />
  ))
  .add('no observed data', () => (
    <UserDetailsContentComponent
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
      isDraggable={false}
    />
  ))
  .add('loading', () => (
    <UserDetailsContentComponent
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
      isDraggable={false}
    />
  ));
