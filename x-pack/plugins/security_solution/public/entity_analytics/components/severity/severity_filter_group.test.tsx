/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React from 'react';
import { render, fireEvent } from '@testing-library/react';
import { SeverityFilterGroup } from './severity_filter_group';
import { RiskScoreEntity, RiskSeverity } from '../../../../common/search_strategy';
import { TestProviders } from '../../../common/mock';
import { createTelemetryServiceMock } from '../../../common/lib/telemetry/telemetry_service.mock';

const mockedTelemetry = createTelemetryServiceMock();
jest.mock('../../../common/lib/kibana', () => {
  return {
    useKibana: () => ({
      services: {
        telemetry: mockedTelemetry,
      },
    }),
  };
});

describe('SeverityFilterGroup', () => {
  beforeEach(() => {
    mockedTelemetry.reportEntityRiskFiltered.mockClear();
  });

  it('preserves sort order when severityCount is out of order', () => {
    const { getByTestId } = render(
      <TestProviders>
        <SeverityFilterGroup
          selectedSeverities={[]}
          severityCount={{
            [RiskSeverity.high]: 0,
            [RiskSeverity.low]: 0,
            [RiskSeverity.critical]: 0,
            [RiskSeverity.moderate]: 0,
            [RiskSeverity.unknown]: 0,
          }}
          onSelect={jest.fn()}
          riskEntity={RiskScoreEntity.user}
        />
      </TestProviders>
    );

    fireEvent.click(getByTestId('risk-filter-button'));

    expect(getByTestId('risk-filter-selectable').textContent).toEqual(
      ['Unknown', 'Low', 'Moderate', 'High', 'Critical'].join('')
    );
  });

  it('sends telemetry when selecting a classification', () => {
    const { getByTestId } = render(
      <TestProviders>
        <SeverityFilterGroup
          selectedSeverities={[]}
          severityCount={{
            [RiskSeverity.high]: 0,
            [RiskSeverity.low]: 0,
            [RiskSeverity.critical]: 0,
            [RiskSeverity.moderate]: 0,
            [RiskSeverity.unknown]: 0,
          }}
          onSelect={jest.fn()}
          riskEntity={RiskScoreEntity.user}
        />
      </TestProviders>
    );

    fireEvent.click(getByTestId('risk-filter-button'));

    fireEvent.click(getByTestId('risk-filter-item-Unknown'));
    expect(mockedTelemetry.reportEntityRiskFiltered).toHaveBeenCalledTimes(1);
  });

  it('does not send telemetry when deselecting a classification', () => {
    const { getByTestId } = render(
      <TestProviders>
        <SeverityFilterGroup
          selectedSeverities={[
            RiskSeverity.critical,
            RiskSeverity.high,
            RiskSeverity.moderate,
            RiskSeverity.low,
            RiskSeverity.unknown,
          ]}
          severityCount={{
            [RiskSeverity.high]: 0,
            [RiskSeverity.low]: 0,
            [RiskSeverity.critical]: 0,
            [RiskSeverity.moderate]: 0,
            [RiskSeverity.unknown]: 0,
          }}
          onSelect={jest.fn()}
          riskEntity={RiskScoreEntity.user}
        />
      </TestProviders>
    );

    fireEvent.click(getByTestId('risk-filter-button'));

    fireEvent.click(getByTestId('risk-filter-item-Unknown'));
    expect(mockedTelemetry.reportEntityRiskFiltered).toHaveBeenCalledTimes(0);
  });
});
