/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { render } from '@testing-library/react';
import React from 'react';
import { TestProviders } from '../../../common/mock';
import type { UserPreviewPanelProps } from '.';
import { UserPreviewPanel } from '.';

import {
  mockManagedUserData,
  mockRiskScoreState,
} from '../../../timelines/components/side_panel/new_user_detail/__mocks__';
import { mockObservedUser } from '../user_right/mocks';

const mockProps: UserPreviewPanelProps = {
  userName: 'test',
  contextID: 'test-user-panel',
  scopeId: 'test-scope-id',
  isDraggable: false,
};

jest.mock('../../../common/components/visualization_actions/visualization_embeddable');

const mockedUseRiskScore = jest.fn().mockReturnValue(mockRiskScoreState);
jest.mock('../../../entity_analytics/api/hooks/use_risk_score', () => ({
  useRiskScore: () => mockedUseRiskScore(),
}));

const mockedUseManagedUser = jest.fn().mockReturnValue(mockManagedUserData);
const mockedUseObservedUser = jest.fn().mockReturnValue(mockObservedUser);

jest.mock(
  '../../../timelines/components/side_panel/new_user_detail/hooks/use_managed_user',
  () => ({
    useManagedUser: () => mockedUseManagedUser(),
  })
);

jest.mock('../user_right/hooks/use_observed_user', () => ({
  useObservedUser: () => mockedUseObservedUser(),
}));

const mockedUseIsExperimentalFeatureEnabled = jest.fn().mockReturnValue(true);
jest.mock('../../../common/hooks/use_experimental_features', () => ({
  useIsExperimentalFeatureEnabled: () => mockedUseIsExperimentalFeatureEnabled(),
}));

describe('UserPanel', () => {
  beforeEach(() => {
    mockedUseRiskScore.mockReturnValue(mockRiskScoreState);
    mockedUseManagedUser.mockReturnValue(mockManagedUserData);
    mockedUseObservedUser.mockReturnValue(mockObservedUser);
  });

  it('renders', () => {
    const { getByTestId, queryByTestId } = render(
      <TestProviders>
        <UserPreviewPanel {...mockProps} />
      </TestProviders>
    );

    expect(getByTestId('user-panel-header')).toBeInTheDocument();
    expect(getByTestId('user-preview-footer')).toBeInTheDocument();
    expect(queryByTestId('securitySolutionFlyoutLoading')).not.toBeInTheDocument();
    expect(
      queryByTestId('securitySolutionFlyoutNavigationExpandDetailButton')
    ).not.toBeInTheDocument();
  });

  it('renders loading state when observed user is loading', () => {
    mockedUseObservedUser.mockReturnValue({
      ...mockObservedUser,
      isLoading: true,
    });

    const { getByTestId } = render(
      <TestProviders>
        <UserPreviewPanel {...mockProps} />
      </TestProviders>
    );

    expect(getByTestId('securitySolutionFlyoutLoading')).toBeInTheDocument();
  });

  it('does not render managed user when experimental flag is disabled', () => {
    mockedUseIsExperimentalFeatureEnabled.mockReturnValue(false);

    const { queryByTestId } = render(
      <TestProviders>
        <UserPreviewPanel {...mockProps} />
      </TestProviders>
    );

    expect(queryByTestId('managedUser-accordion-button')).not.toBeInTheDocument();
  });

  it('renders loading state when managed user is loading', () => {
    mockedUseManagedUser.mockReturnValue({
      ...mockManagedUserData,
      isLoading: true,
    });

    const { getByTestId } = render(
      <TestProviders>
        <UserPreviewPanel {...mockProps} />
      </TestProviders>
    );

    expect(getByTestId('securitySolutionFlyoutLoading')).toBeInTheDocument();
  });
});
