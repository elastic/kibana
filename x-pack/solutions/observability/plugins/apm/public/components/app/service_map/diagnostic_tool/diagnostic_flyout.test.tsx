/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import { DiagnosticFlyout } from './diagnostic_flyout';

jest.mock('../../../../hooks/use_apm_params', () => ({
  useAnyOfApmParams: () => ({ query: { rangeFrom: 'now-15m', rangeTo: 'now' } }),
}));

jest.mock('../../../../hooks/use_time_range', () => ({
  useTimeRange: () => ({ start: '2024-01-01T00:00:00Z', end: '2024-01-01T01:00:00Z' }),
}));

jest.mock('@kbn/kibana-react-plugin/public', () => ({
  useKibana: () => ({ services: { notifications: { toasts: { addDanger: jest.fn() } } } }),
}));

jest.mock('./diagnostic_configuration_form', () => ({
  DiagnosticConfigurationForm: ({ sourceNode }: { sourceNode?: string }) => (
    <div data-test-subj="diagnosticConfigurationForm" data-source-node={sourceNode ?? ''} />
  ),
}));

jest.mock('./diagnostic_results', () => ({
  DiagnosticResults: () => <div data-testid="diagnosticResults" />,
}));

jest.mock('../../../shared/technical_preview_badge', () => ({
  TechnicalPreviewBadge: () => null,
}));

describe('DiagnosticFlyout', () => {
  it('pre-populates sourceNode when selection is provided', () => {
    render(
      <DiagnosticFlyout isOpen={true} onClose={jest.fn()} selection={{ id: 'my-service' } as any} />
    );

    expect(screen.getByTestId('diagnosticConfigurationForm')).toHaveAttribute(
      'data-source-node',
      'my-service'
    );
  });

  it('leaves sourceNode empty when selection is omitted', () => {
    render(<DiagnosticFlyout isOpen={true} onClose={jest.fn()} />);

    expect(screen.getByTestId('diagnosticConfigurationForm')).toHaveAttribute(
      'data-source-node',
      ''
    );
  });

  it('renders nothing when isOpen is false', () => {
    const { container } = render(<DiagnosticFlyout isOpen={false} onClose={jest.fn()} />);
    expect(container).toBeEmptyDOMElement();
  });
});
