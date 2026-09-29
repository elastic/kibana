/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { vi } from 'vitest';

import React from 'react';
import { render, screen } from '@testing-library/react';
import { DiagnosticFlyout } from './diagnostic_flyout';

vi.mock('../../../../hooks/use_apm_params', () => {
      const mocked = {
      useAnyOfApmParams: () => ({ query: { rangeFrom: 'now-15m', rangeTo: 'now' } }),
    };
      return { ...mocked, default: mocked };
    });

vi.mock('../../../../hooks/use_time_range', () => {
      const mocked = {
      useTimeRange: () => ({ start: '2024-01-01T00:00:00Z', end: '2024-01-01T01:00:00Z' }),
    };
      return { ...mocked, default: mocked };
    });

vi.mock('@kbn/kibana-react-plugin/public', () => {
      const mocked = {
      useKibana: () => ({ services: { notifications: { toasts: { addDanger: vi.fn() } } } }),
    };
      return { ...mocked, default: mocked };
    });

vi.mock('./diagnostic_configuration_form', () => {
      const mocked = {
      DiagnosticConfigurationForm: ({ sourceNode }: { sourceNode?: string }) => (
        <div data-test-subj="diagnosticConfigurationForm" data-source-node={sourceNode ?? ''} />
      ),
    };
      return { ...mocked, default: mocked };
    });

vi.mock('./diagnostic_results', () => {
      const mocked = {
      DiagnosticResults: () => <div data-testid="diagnosticResults" />,
    };
      return { ...mocked, default: mocked };
    });

vi.mock('../../../shared/technical_preview_badge', () => {
      const mocked = {
      TechnicalPreviewBadge: () => null,
    };
      return { ...mocked, default: mocked };
    });

describe('DiagnosticFlyout', () => {
  it('pre-populates sourceNode when selection is provided', () => {
    render(
      <DiagnosticFlyout isOpen={true} onClose={vi.fn()} selection={{ id: 'my-service' } as any} />
    );

    expect(screen.getByTestId('diagnosticConfigurationForm')).toHaveAttribute(
      'data-source-node',
      'my-service'
    );
  });

  it('leaves sourceNode empty when selection is omitted', () => {
    render(<DiagnosticFlyout isOpen={true} onClose={vi.fn()} />);

    expect(screen.getByTestId('diagnosticConfigurationForm')).toHaveAttribute(
      'data-source-node',
      ''
    );
  });

  it('renders nothing when isOpen is false', () => {
    const { container } = render(<DiagnosticFlyout isOpen={false} onClose={vi.fn()} />);
    expect(container).toBeEmptyDOMElement();
  });
});
