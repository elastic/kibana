/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { enableDiagnosticMode } from '@kbn/observability-plugin/common';
import { ServiceMapDiagnosticButton } from './service_map_diagnostic_button';

jest.mock('../../../context/apm_plugin/use_apm_plugin_context');
jest.mock('./diagnostic_tool/diagnostic_flyout', () => ({
  DiagnosticFlyout: ({ isOpen, selection }: { isOpen: boolean; selection?: { id: string } }) =>
    isOpen ? (
      <div data-test-subj="diagnosticFlyout" data-selection-id={selection?.id ?? ''} />
    ) : null,
}));
jest.mock('@xyflow/react', () => ({
  Panel: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

const mockUseApmPluginContext = jest.requireMock(
  '../../../context/apm_plugin/use_apm_plugin_context'
).useApmPluginContext;

function buildContext(enabled: boolean | undefined) {
  return {
    core: {
      uiSettings: {
        get: (key: string) => (key === enableDiagnosticMode ? enabled : undefined),
      },
    },
  };
}

describe('ServiceMapDiagnosticButton', () => {
  it('renders nothing when the diagnostic mode setting is off', () => {
    mockUseApmPluginContext.mockReturnValue(buildContext(false));
    const { container } = render(<ServiceMapDiagnosticButton />);
    expect(container).toBeEmptyDOMElement();
  });

  it('renders nothing when the diagnostic mode setting is undefined', () => {
    mockUseApmPluginContext.mockReturnValue(buildContext(undefined));
    const { container } = render(<ServiceMapDiagnosticButton />);
    expect(container).toBeEmptyDOMElement();
  });

  it('renders the button when the diagnostic mode setting is on', () => {
    mockUseApmPluginContext.mockReturnValue(buildContext(true));
    render(<ServiceMapDiagnosticButton />);
    expect(screen.getByTestId('serviceMapOpenDiagnosticButton')).toBeInTheDocument();
    expect(screen.getByText('Missing connections?')).toBeInTheDocument();
  });

  it('opens the flyout when the button is clicked', () => {
    mockUseApmPluginContext.mockReturnValue(buildContext(true));
    render(<ServiceMapDiagnosticButton />);

    expect(screen.queryByTestId('diagnosticFlyout')).not.toBeInTheDocument();
    fireEvent.click(screen.getByTestId('serviceMapOpenDiagnosticButton'));
    expect(screen.getByTestId('diagnosticFlyout')).toBeInTheDocument();
  });

  it('forwards selection to the flyout when a service node is selected', () => {
    mockUseApmPluginContext.mockReturnValue(buildContext(true));
    render(<ServiceMapDiagnosticButton selection={{ id: 'my-service' } as any} />);

    fireEvent.click(screen.getByTestId('serviceMapOpenDiagnosticButton'));
    expect(screen.getByTestId('diagnosticFlyout')).toHaveAttribute(
      'data-selection-id',
      'my-service'
    );
  });
});
