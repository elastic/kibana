/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { render } from '@testing-library/react';
import React from 'react';
import { TestProviders } from '../../../common/mock';
import { UserDetailsContent } from './user_details_content';

import {
  mockManagedUser,
  mockObservedUser,
  mockRiskScoreState,
} from '../../../timelines/components/side_panel/new_user_detail/__mocks__';

const mockProps = {
  userName: 'test',
  managedUser: mockManagedUser,
  observedUser: mockObservedUser,
  riskScoreState: mockRiskScoreState,
  contextID: 'test-user-details',
  scopeId: 'test-scope-id',
  isDraggable: false,
};

jest.mock('../../../common/components/visualization_actions/visualization_embeddable');

describe('UserDetailsContent', () => {
  it('renders', () => {
    const { getByTestId, queryByTestId } = render(
      <TestProviders>
        <UserDetailsContent {...mockProps} />
      </TestProviders>
    );

    expect(getByTestId('user-details-body-header')).toBeInTheDocument();
    expect(queryByTestId('securitySolutionFlyoutLoading')).not.toBeInTheDocument();
    expect(getByTestId('securitySolutionFlyoutNavigationExpandDetailButton')).toBeInTheDocument();
  });

  it('renders loading state when risk score is loading', () => {
    const { getByTestId } = render(
      <TestProviders>
        <UserDetailsContent
          {...mockProps}
          riskScoreState={{
            ...mockProps.riskScoreState,
            data: undefined,
            loading: true,
          }}
        />
      </TestProviders>
    );

    expect(getByTestId('securitySolutionFlyoutLoading')).toBeInTheDocument();
  });

  it('renders loading state when observed yuser is loading', () => {
    const { getByTestId } = render(
      <TestProviders>
        <UserDetailsContent
          {...mockProps}
          observedUser={{
            ...mockProps.observedUser,
            isLoading: true,
          }}
        />
      </TestProviders>
    );

    expect(getByTestId('securitySolutionFlyoutLoading')).toBeInTheDocument();
  });

  it('renders loading state when managed user is loading', () => {
    const { getByTestId } = render(
      <TestProviders>
        <UserDetailsContent
          {...mockProps}
          managedUser={{
            ...mockProps.managedUser,
            isLoading: true,
          }}
        />
      </TestProviders>
    );

    expect(getByTestId('securitySolutionFlyoutLoading')).toBeInTheDocument();
  });
});
