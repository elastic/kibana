/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { render } from '@testing-library/react';
import React from 'react';
import { TestProviders } from '../../../common/mock';
import type { UserPanelProps } from '.';
import { UserPanel } from '.';
import { mockRiskScoreState } from './mocks';

import {
  mockManagedUser,
  mockObservedUser,
} from '../../../timelines/components/side_panel/new_user_detail/__mocks__';

const mockProps: UserPanelProps = {
  userName: 'test',
  contextID: 'test-user-panel',
  scopeId: 'test-scope-id',
  isDraggable: false,
};

jest.mock('../../../common/components/visualization_actions/visualization_embeddable');

const mockedUseRiskScore = jest.fn().mockReturnValue(mockRiskScoreState);
jest.mock('../../../explore/containers/risk_score', () => ({
  useRiskScore: () => mockedUseRiskScore(),
}));

const mockedUseManagedUser = jest.fn().mockReturnValue(mockManagedUser);
const mockedUseObservedUser = jest.fn().mockReturnValue(mockObservedUser);

jest.mock('../../../timelines/components/side_panel/new_user_detail/hooks', () => {
  const originalModule = jest.requireActual(
    '../../../timelines/components/side_panel/new_user_detail/hooks'
  );
  return {
    ...originalModule,
    useManagedUser: () => mockedUseManagedUser(),
    useObservedUser: () => mockedUseObservedUser(),
  };
});

describe('UserPanel', () => {
  beforeEach(() => {
    mockedUseRiskScore.mockReturnValue(mockRiskScoreState);
    mockedUseManagedUser.mockReturnValue(mockManagedUser);
    mockedUseObservedUser.mockReturnValue(mockObservedUser);
  });

  it('renders', () => {
    const { getByTestId, queryByTestId } = render(
      <TestProviders>
        <UserPanel {...mockProps} />
      </TestProviders>
    );

    expect(getByTestId('user-panel-header')).toBeInTheDocument();
    expect(queryByTestId('securitySolutionFlyoutLoading')).not.toBeInTheDocument();
    expect(getByTestId('securitySolutionFlyoutNavigationExpandDetailButton')).toBeInTheDocument();
  });

  it('renders loading state when risk score is loading', () => {
    mockedUseRiskScore.mockReturnValue({
      ...mockRiskScoreState,
      data: undefined,
      loading: true,
    });

    const { getByTestId } = render(
      <TestProviders>
        <UserPanel {...mockProps} />
      </TestProviders>
    );

    expect(getByTestId('securitySolutionFlyoutLoading')).toBeInTheDocument();
  });

  it('renders loading state when observed user is loading', () => {
    mockedUseObservedUser.mockReturnValue({
      ...mockObservedUser,
      isLoading: true,
    });

    const { getByTestId } = render(
      <TestProviders>
        <UserPanel {...mockProps} />
      </TestProviders>
    );

    expect(getByTestId('securitySolutionFlyoutLoading')).toBeInTheDocument();
  });

  it('renders loading state when managed user is loading', () => {
    mockedUseManagedUser.mockReturnValue({
      ...mockManagedUser,
      isLoading: true,
    });

    const { getByTestId } = render(
      <TestProviders>
        <UserPanel {...mockProps} />
      </TestProviders>
    );

    expect(getByTestId('securitySolutionFlyoutLoading')).toBeInTheDocument();
  });
});
