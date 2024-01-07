/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { render } from '@testing-library/react';
import React from 'react';
import { RiskScoreEntity, RiskSeverity } from '../../../../common/search_strategy';
import { VisualizationEmbeddable } from '../../../common/components/visualization_actions/visualization_embeddable';
import { useIsExperimentalFeatureEnabled } from '../../../common/hooks/use_experimental_features';
import { useSpaceId } from '../../../common/hooks/use_space_id';
import { TestProviders } from '../../../common/mock';
import { generateSeverityFilter } from '../../../explore/hosts/store/helpers';
import { ChartContent } from './chart_content';
import { mockSeverityCount } from './__mocks__';

jest.mock('../../../common/components/visualization_actions/visualization_embeddable');
jest.mock('../../../common/hooks/use_experimental_features', () => ({
  useIsExperimentalFeatureEnabled: jest.fn(),
}));
jest.mock('../../../common/hooks/use_space_id', () => ({
  useSpaceId: jest.fn(),
}));
describe('ChartContent', () => {
  const props = {
    dataExists: true,
    kpiQueryId: 'mockQueryId',
    riskEntity: RiskScoreEntity.host,
    severityCount: undefined,
    timerange: { from: '2022-04-05T12:00:00.000Z', to: '2022-04-08T12:00:00.000Z' },
    selectedSeverity: [RiskSeverity.unknown],
  };
  beforeEach(() => {
    jest.clearAllMocks();
    (useIsExperimentalFeatureEnabled as jest.Mock).mockReturnValue(false);
    (useSpaceId as jest.Mock).mockReturnValue('default');
  });
  it('renders VisualizationEmbeddable when isChartEmbeddablesEnabled = true and dataExists = true', () => {
    (useIsExperimentalFeatureEnabled as jest.Mock).mockReturnValue(true);

    const { getByTestId } = render(<ChartContent {...props} />);

    expect(getByTestId('visualization-embeddable')).toBeInTheDocument();
  });

  it('should not render VisualizationEmbeddable when dataExists = false', () => {
    (useIsExperimentalFeatureEnabled as jest.Mock).mockReturnValue(true);

    const { queryByTestId } = render(
      <TestProviders>
        <ChartContent {...props} dataExists={false} />
      </TestProviders>
    );

    expect(queryByTestId('visualization-embeddable')).not.toBeInTheDocument();
  });

  it('should not render VisualizationEmbeddable when spaceId = undefined', () => {
    (useIsExperimentalFeatureEnabled as jest.Mock).mockReturnValue(true);
    (useSpaceId as jest.Mock).mockReturnValue(undefined);
    const { queryByTestId } = render(
      <TestProviders>
        <ChartContent {...props} />
      </TestProviders>
    );

    expect(queryByTestId('visualization-embeddable')).not.toBeInTheDocument();
  });

  it('should render filters if available', () => {
    (useIsExperimentalFeatureEnabled as jest.Mock).mockReturnValue(true);
    render(
      <TestProviders>
        <ChartContent {...props} />
      </TestProviders>
    );

    expect(
      (VisualizationEmbeddable as unknown as jest.Mock).mock.calls[0][0].extraOptions.filters
    ).toEqual(generateSeverityFilter(props.selectedSeverity, props.riskEntity));
  });

  it('renders RiskScoreDonutChart when isChartEmbeddablesEnabled = false', () => {
    const { getByTestId } = render(
      <TestProviders>
        <ChartContent {...props} severityCount={mockSeverityCount} />
      </TestProviders>
    );

    expect(getByTestId('risk-score-donut-chart')).toBeInTheDocument();
  });
});
