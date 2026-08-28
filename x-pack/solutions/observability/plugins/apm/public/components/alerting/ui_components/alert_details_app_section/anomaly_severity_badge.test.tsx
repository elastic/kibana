/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import { EuiProvider } from '@elastic/eui';
import { ML_ANOMALY_SEVERITY } from '@kbn/ml-anomaly-utils/anomaly_severity';
import { AnomalySeverityBadge } from './anomaly_severity_badge';

jest.mock('@kbn/ml-anomaly-utils', () => {
  const { getSeverityColor } = jest.requireActual('@kbn/ml-anomaly-utils/get_severity_color');

  return {
    useSeverityColor: getSeverityColor,
  };
});

const renderComponent = (props: React.ComponentProps<typeof AnomalySeverityBadge>) =>
  render(
    <EuiProvider>
      <AnomalySeverityBadge {...props} />
    </EuiProvider>
  );

describe('AnomalySeverityBadge', () => {
  it('renders the severity label with severity icon', () => {
    renderComponent({ severity: ML_ANOMALY_SEVERITY.CRITICAL, score: 82 });

    expect(screen.getByTestId('apmAlertDetailsAnomalySeverityBadge')).toBeInTheDocument();
    expect(screen.getByText('Critical')).toBeInTheDocument();
  });

  it('renders major severity label', () => {
    renderComponent({ severity: ML_ANOMALY_SEVERITY.MAJOR, score: 55 });

    expect(screen.getByText('Major')).toBeInTheDocument();
  });
});
