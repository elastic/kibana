/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { render } from '@testing-library/react';
import React from 'react';

import { TestProviders } from '../../../../../common/mock';

import type { EuiHealthProps } from '@elastic/eui';
import { EuiHealth } from '@elastic/eui';

import { euiThemeVars } from '@kbn/ui-theme';
import { RiskSeverity } from '../../../../../../common/search_strategy';
import { RiskScoreLevel } from '.';
import { SEVERITY_COLOR } from '../../../../../overview/components/detection_response/utils';

jest.mock('@elastic/eui', () => {
  const original = jest.requireActual('@elastic/eui');
  return {
    ...jest.requireActual('@elastic/eui'),
    EuiHealth: jest.fn((props: EuiHealthProps) => <original.EuiHealth {...props} />),
  };
});

describe('RiskScore', () => {
  const context = {};
  it('renders critical severity risk score', () => {
    const { container } = render(
      <TestProviders>
        <RiskScoreLevel severity={RiskSeverity.critical} />
      </TestProviders>
    );

    expect(container).toHaveTextContent(RiskSeverity.critical);

    expect(EuiHealth as jest.Mock).toHaveBeenLastCalledWith(
      expect.objectContaining({ color: SEVERITY_COLOR.critical }),
      context
    );
  });

  it('renders hight severity risk score', () => {
    const { container } = render(
      <TestProviders>
        <RiskScoreLevel severity={RiskSeverity.high} />
      </TestProviders>
    );

    expect(container).toHaveTextContent(RiskSeverity.high);

    expect(EuiHealth as jest.Mock).toHaveBeenLastCalledWith(
      expect.objectContaining({ color: SEVERITY_COLOR.high }),
      context
    );
  });

  it('renders moderate severity risk score', () => {
    const { container } = render(
      <TestProviders>
        <RiskScoreLevel severity={RiskSeverity.moderate} />
      </TestProviders>
    );

    expect(container).toHaveTextContent(RiskSeverity.moderate);

    expect(EuiHealth as jest.Mock).toHaveBeenLastCalledWith(
      expect.objectContaining({ color: SEVERITY_COLOR.medium }),
      context
    );
  });

  it('renders low severity risk score', () => {
    const { container } = render(
      <TestProviders>
        <RiskScoreLevel severity={RiskSeverity.low} />
      </TestProviders>
    );

    expect(container).toHaveTextContent(RiskSeverity.low);

    expect(EuiHealth as jest.Mock).toHaveBeenLastCalledWith(
      expect.objectContaining({ color: SEVERITY_COLOR.low }),
      context
    );
  });

  it('renders unknown severity risk score', () => {
    const { container } = render(
      <TestProviders>
        <RiskScoreLevel severity={RiskSeverity.unknown} />
      </TestProviders>
    );

    expect(container).toHaveTextContent(RiskSeverity.unknown);

    expect(EuiHealth as jest.Mock).toHaveBeenLastCalledWith(
      expect.objectContaining({ color: euiThemeVars.euiColorMediumShade }),
      context
    );
  });

  it("doesn't render background-color when hideBackgroundColor is true", () => {
    const { queryByTestId } = render(
      <TestProviders>
        <RiskScoreLevel severity={RiskSeverity.critical} hideBackgroundColor />
      </TestProviders>
    );

    expect(queryByTestId('risk-score')).toHaveStyleRule('background-color', undefined);
  });
});
