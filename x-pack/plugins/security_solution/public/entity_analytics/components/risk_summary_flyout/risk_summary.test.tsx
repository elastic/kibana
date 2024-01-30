/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  mockHostRiskScoreState,
  mockUserRiskScoreState,
} from '../../../flyout/entity_details/mocks';
import { render } from '@testing-library/react';
import React from 'react';
import { TestProviders } from '../../../common/mock';
import { RiskSummary } from './risk_summary';
import type {
  LensAttributes,
  VisualizationEmbeddableProps,
} from '../../../common/components/visualization_actions/types';

const mockVisualizationEmbeddable = jest
  .fn()
  .mockReturnValue(<div data-test-subj="visualization-embeddable" />);

jest.mock('../../../common/components/visualization_actions/visualization_embeddable', () => ({
  VisualizationEmbeddable: (props: VisualizationEmbeddableProps) =>
    mockVisualizationEmbeddable(props),
}));

describe('RiskSummary', () => {
  beforeEach(() => {
    mockVisualizationEmbeddable.mockClear();
  });

  it('renders risk summary table', () => {
    const { getByTestId } = render(
      <TestProviders>
        <RiskSummary
          riskScoreData={mockHostRiskScoreState}
          queryId={'testQuery'}
          openDetailsPanel={() => {}}
        />
      </TestProviders>
    );

    expect(getByTestId('risk-summary-table')).toBeInTheDocument();
    expect(getByTestId('risk-summary-table')).toHaveTextContent(
      `Inputs${mockHostRiskScoreState.data?.[0].host.risk.category_1_count ?? 0}`
    );
    expect(getByTestId('risk-summary-table')).toHaveTextContent(
      `AlertsScore${mockHostRiskScoreState.data?.[0].host.risk.category_1_score ?? 0}`
    );
    expect(getByTestId('risk-summary-table')).toHaveTextContent(
      `Inputs${mockHostRiskScoreState.data?.[0].host.risk.category_2_count ?? 0}`
    );
    expect(getByTestId('risk-summary-table')).toHaveTextContent(
      `ContextsScore${mockHostRiskScoreState.data?.[0].host.risk.category_2_score ?? 0}`
    );
  });

  it('renders risk summary table when riskScoreData is empty', () => {
    const { getByTestId } = render(
      <TestProviders>
        <RiskSummary
          riskScoreData={{ ...mockHostRiskScoreState, data: undefined }}
          queryId={'testQuery'}
          openDetailsPanel={() => {}}
        />
      </TestProviders>
    );
    expect(getByTestId('risk-summary-table')).toBeInTheDocument();
  });

  it('renders visualization embeddable', () => {
    const { getByTestId } = render(
      <TestProviders>
        <RiskSummary
          riskScoreData={mockHostRiskScoreState}
          queryId={'testQuery'}
          openDetailsPanel={() => {}}
        />
      </TestProviders>
    );

    expect(getByTestId('visualization-embeddable')).toBeInTheDocument();
  });

  it('renders updated at', () => {
    const { getByTestId } = render(
      <TestProviders>
        <RiskSummary
          riskScoreData={mockHostRiskScoreState}
          queryId={'testQuery'}
          openDetailsPanel={() => {}}
        />
      </TestProviders>
    );

    expect(getByTestId('risk-summary-updatedAt')).toHaveTextContent('Updated Nov 8, 1989');
  });

  it('builds lens attributes for host risk score', () => {
    render(
      <TestProviders>
        <RiskSummary
          riskScoreData={mockHostRiskScoreState}
          queryId={'testQuery'}
          openDetailsPanel={() => {}}
        />
      </TestProviders>
    );

    const lensAttributes: LensAttributes =
      mockVisualizationEmbeddable.mock.calls[0][0].lensAttributes;
    const datasourceLayers = Object.values(
      lensAttributes.state.datasourceStates.formBased?.layers ?? {}
    );
    const firstColumn = Object.values(datasourceLayers[0].columns)[0];

    expect(lensAttributes.state.query.query).toEqual('host.name: test');
    expect(firstColumn).toEqual(
      expect.objectContaining({
        sourceField: 'host.risk.calculated_score_norm',
      })
    );
  });

  it('builds lens cases attachment metadata for host risk score', () => {
    render(
      <TestProviders>
        <RiskSummary
          riskScoreData={mockHostRiskScoreState}
          queryId={'testQuery'}
          openDetailsPanel={() => {}}
        />
      </TestProviders>
    );

    const lensMetadata: LensAttributes =
      mockVisualizationEmbeddable.mock.calls[0][0].casesAttachmentMetadata;

    expect(lensMetadata).toMatchInlineSnapshot(`
      Object {
        "description": "Risk score for host test",
      }
    `);
  });

  it('builds lens cases attachment metadata for user risk score', () => {
    render(
      <TestProviders>
        <RiskSummary
          riskScoreData={mockUserRiskScoreState}
          queryId={'testQuery'}
          openDetailsPanel={() => {}}
        />
      </TestProviders>
    );

    const lensMetadata: LensAttributes =
      mockVisualizationEmbeddable.mock.calls[0][0].casesAttachmentMetadata;

    expect(lensMetadata).toMatchInlineSnapshot(`
      Object {
        "description": "Risk score for user test",
      }
    `);
  });

  it('builds lens attributes for user risk score', () => {
    render(
      <TestProviders>
        <RiskSummary
          riskScoreData={mockUserRiskScoreState}
          queryId={'testQuery'}
          openDetailsPanel={() => {}}
        />
      </TestProviders>
    );

    const lensAttributes: LensAttributes =
      mockVisualizationEmbeddable.mock.calls[0][0].lensAttributes;
    const datasourceLayers = Object.values(
      lensAttributes.state.datasourceStates.formBased?.layers ?? {}
    );
    const firstColumn = Object.values(datasourceLayers[0].columns)[0];

    expect(lensAttributes.state.query.query).toEqual('user.name: test');
    expect(firstColumn).toEqual(
      expect.objectContaining({
        sourceField: 'user.risk.calculated_score_norm',
      })
    );
  });
});
