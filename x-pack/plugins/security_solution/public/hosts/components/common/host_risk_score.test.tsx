/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { render } from '@testing-library/react';
import React from 'react';
import { HostRiskSeverity } from '../../../../common/search_strategy';
import { TestProviders } from '../../../common/mock';
import { HostRiskScore } from './host_risk_score';

import { EuiHealth, EuiHealthProps } from '@elastic/eui';

import { euiThemeVars } from '@kbn/ui-shared-deps-src/theme';

jest.mock('@elastic/eui', () => {
  const original = jest.requireActual('@elastic/eui');
  return {
    ...jest.requireActual('@elastic/eui'),
    EuiHealth: jest.fn((props: EuiHealthProps) => <original.EuiHealth {...props} />),
  };
});

describe('HostRiskScore', () => {
  const context = {};
  it('renders critical severity risk score', () => {
    const { container } = render(
      <TestProviders>
        <HostRiskScore severity={HostRiskSeverity.critical} />
      </TestProviders>
    );

    expect(container).toHaveTextContent(HostRiskSeverity.critical);

    expect(EuiHealth as jest.Mock).toHaveBeenLastCalledWith(
      expect.objectContaining({ color: euiThemeVars.euiColorDanger }),
      context
    );
  });

  it('renders hight severity risk score', () => {
    const { container } = render(
      <TestProviders>
        <HostRiskScore severity={HostRiskSeverity.high} />
      </TestProviders>
    );

    expect(container).toHaveTextContent(HostRiskSeverity.high);

    expect(EuiHealth as jest.Mock).toHaveBeenLastCalledWith(
      expect.objectContaining({ color: euiThemeVars.euiColorVis9_behindText }),
      context
    );
  });

  it('renders moderate severity risk score', () => {
    const { container } = render(
      <TestProviders>
        <HostRiskScore severity={HostRiskSeverity.moderate} />
      </TestProviders>
    );

    expect(container).toHaveTextContent(HostRiskSeverity.moderate);

    expect(EuiHealth as jest.Mock).toHaveBeenLastCalledWith(
      expect.objectContaining({ color: euiThemeVars.euiColorWarning }),
      context
    );
  });

  it('renders low severity risk score', () => {
    const { container } = render(
      <TestProviders>
        <HostRiskScore severity={HostRiskSeverity.low} />
      </TestProviders>
    );

    expect(container).toHaveTextContent(HostRiskSeverity.low);

    expect(EuiHealth as jest.Mock).toHaveBeenLastCalledWith(
      expect.objectContaining({ color: euiThemeVars.euiColorVis0 }),
      context
    );
  });

  it('renders unknown severity risk score', () => {
    const { container } = render(
      <TestProviders>
        <HostRiskScore severity={HostRiskSeverity.unknown} />
      </TestProviders>
    );

    expect(container).toHaveTextContent(HostRiskSeverity.unknown);

    expect(EuiHealth as jest.Mock).toHaveBeenLastCalledWith(
      expect.objectContaining({ color: euiThemeVars.euiColorMediumShade }),
      context
    );
  });

  it("doesn't render background-color when hideBackgroundColor is true", () => {
    const { queryByTestId } = render(
      <TestProviders>
        <HostRiskScore severity={HostRiskSeverity.critical} hideBackgroundColor />
      </TestProviders>
    );

    expect(queryByTestId('host-risk-score')).toHaveStyleRule('background-color', undefined);
  });
});
