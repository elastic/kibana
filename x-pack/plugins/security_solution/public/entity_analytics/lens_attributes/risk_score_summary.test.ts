/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { RiskScoreEntity } from '../../../common/entity_analytics/risk_engine';
import { renderHook } from '@testing-library/react-hooks';
import { getRiskScoreSummaryAttributes } from './risk_score_summary';
import { RiskSeverity } from '../../../common/search_strategy';
import type { MetricVisualizationState } from '@kbn/lens-plugin/public';
import { wrapper } from '../../common/components/visualization_actions/mocks';
import { useLensAttributes } from '../../common/components/visualization_actions/use_lens_attributes';

jest.mock('../../common/containers/sourcerer', () => ({
  useSourcererDataView: jest.fn().mockReturnValue({
    selectedPatterns: ['auditbeat-mytest-*'],
    dataViewId: 'security-solution-my-test',
    indicesExist: true,
  }),
}));

jest.mock('uuid', () => ({
  v4: jest.fn().mockReturnValue('2cc5663b-f062-43f8-8688-fc8166c2ca8e'),
}));

describe('getRiskScoreSummaryAttributes', () => {
  it('should render', () => {
    const { result } = renderHook(
      () =>
        useLensAttributes({
          lensAttributes: getRiskScoreSummaryAttributes({
            severity: RiskSeverity.Low,
            query: `user.name: test.user`,
            spaceId: 'default',
            riskEntity: RiskScoreEntity.user,
          }),
        }),
      { wrapper }
    );

    expect(result?.current).toMatchSnapshot();
  });

  it('renders the subtitle', () => {
    const { result } = renderHook(
      () =>
        useLensAttributes({
          lensAttributes: getRiskScoreSummaryAttributes({
            severity: RiskSeverity.Low,
            query: `user.name: test.user`,
            spaceId: 'default',
            riskEntity: RiskScoreEntity.user,
          }),
        }),
      { wrapper }
    );

    expect((result?.current?.state.visualization as MetricVisualizationState).subtitle).toBe('Low');
  });

  it('renders the query when applyGlobalQueriesAndFilters is false', () => {
    const query = `test.field: test.user`;

    const { result } = renderHook(
      () =>
        useLensAttributes({
          lensAttributes: getRiskScoreSummaryAttributes({
            severity: RiskSeverity.Low,
            query,
            spaceId: 'default',
            riskEntity: RiskScoreEntity.user,
          }),
          applyGlobalQueriesAndFilters: false,
        }),
      { wrapper }
    );

    expect(result?.current?.state.query.query).toBe(query);
  });
});
