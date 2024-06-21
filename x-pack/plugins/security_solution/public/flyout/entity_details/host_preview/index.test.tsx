/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { render } from '@testing-library/react';
import React from 'react';
import { TestProviders } from '../../../common/mock';
import { mockHostRiskScoreState, mockObservedHostData } from '../mocks';
import type { HostPreviewPanelProps } from '.';
import { HostPreviewPanel } from '.';

const mockProps: HostPreviewPanelProps = {
  hostName: 'test',
  contextID: 'test-host -panel',
  scopeId: 'test-scope-id',
  isDraggable: false,
};

jest.mock('../../../common/components/visualization_actions/visualization_embeddable');

const mockedHostRiskScore = jest.fn().mockReturnValue(mockHostRiskScoreState);
jest.mock('../../../entity_analytics/api/hooks/use_risk_score', () => ({
  useRiskScore: () => mockedHostRiskScore(),
}));

const mockedUseObservedHost = jest.fn().mockReturnValue(mockObservedHostData);

jest.mock('../host_right/hooks/use_observed_host', () => ({
  useObservedHost: () => mockedUseObservedHost(),
}));

describe('HostPanel', () => {
  beforeEach(() => {
    mockedHostRiskScore.mockReturnValue(mockHostRiskScoreState);
    mockedUseObservedHost.mockReturnValue(mockObservedHostData);
  });

  it('renders host preview', () => {
    const { getByTestId, queryByTestId } = render(
      <TestProviders>
        <HostPreviewPanel {...mockProps} />
      </TestProviders>
    );

    expect(getByTestId('host-panel-header')).toBeInTheDocument();
    expect(getByTestId('host-preview-footer')).toBeInTheDocument();
    expect(queryByTestId('securitySolutionFlyoutLoading')).not.toBeInTheDocument();
    expect(
      queryByTestId('securitySolutionFlyoutNavigationExpandDetailButton')
    ).not.toBeInTheDocument();
  });

  it('renders loading state when observed host is loading', () => {
    mockedUseObservedHost.mockReturnValue({
      ...mockObservedHostData,
      isLoading: true,
    });

    const { getByTestId } = render(
      <TestProviders>
        <HostPreviewPanel {...mockProps} />
      </TestProviders>
    );

    expect(getByTestId('securitySolutionFlyoutLoading')).toBeInTheDocument();
  });
});
