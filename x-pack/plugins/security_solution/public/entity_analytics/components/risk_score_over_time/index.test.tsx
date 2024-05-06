/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { render } from '@testing-library/react';
import React from 'react';
import { RiskScoreOverTime } from '.';
import { TestProviders } from '../../../common/mock';
import { RiskScoreEntity } from '../../../../common/search_strategy';
import { useIsExperimentalFeatureEnabled } from '../../../common/hooks/use_experimental_features';

const mockUseIsExperimentalFeatureEnabled = useIsExperimentalFeatureEnabled as jest.Mock;
jest.mock('@elastic/charts', () => {
  const original = jest.requireActual('@elastic/charts');
  return {
    ...original,
    LineSeries: jest.fn().mockImplementation(() => <></>),
  };
});

jest.mock('../../../common/hooks/use_experimental_features', () => ({
  useIsExperimentalFeatureEnabled: jest.fn(),
}));
jest.mock('../../../common/components/visualization_actions/visualization_embeddable');
jest.mock('../../../common/hooks/use_space_id', () => ({
  useSpaceId: jest.fn().mockReturnValue('default'),
}));

const props = {
  riskEntity: RiskScoreEntity.host,
  riskScore: [],
  loading: false,
  from: '2020-07-07T08:20:18.966Z',
  to: '2020-07-08T08:20:18.966Z',
  queryId: 'test_query_id',
  title: 'test_query_title',
  toggleStatus: true,
};

describe('Risk Score Over Time', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseIsExperimentalFeatureEnabled.mockReturnValue(false);
  });

  it('renders', () => {
    const { queryByTestId } = render(
      <TestProviders>
        <RiskScoreOverTime {...props} />
      </TestProviders>
    );

    expect(queryByTestId('RiskScoreOverTime')).toBeInTheDocument();
  });

  it('renders VisualizationEmbeddable', () => {
    mockUseIsExperimentalFeatureEnabled.mockReturnValue(true);

    const { queryByTestId } = render(
      <TestProviders>
        <RiskScoreOverTime {...props} />
      </TestProviders>
    );

    expect(queryByTestId('visualization-embeddable')).toBeInTheDocument();
  });
});
