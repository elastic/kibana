/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { __IntlProvider as IntlProvider } from '@kbn/i18n-react';

import React from 'react';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, useSearchParams } from 'react-router-dom-v5-compat';
import { StartNewChat } from './start_new_chat';
import { useLoadConnectors } from '../hooks/use_load_connectors';
import { useUsageTracker } from '../hooks/use_usage_tracker';
import { AnalyticsEvents } from '../analytics/constants';
import { useSourceIndicesFields } from '../hooks/use_source_indices_field';
import { useKibana } from '../hooks/use_kibana';
import { PlaygroundProvider } from '../providers/playground_provider';

jest.mock('../hooks/use_load_connectors');
jest.mock('../hooks/use_usage_tracker');
jest.mock('../hooks/use_source_indices_field', () => ({
  useSourceIndicesFields: jest.fn(() => ({ addIndex: jest.fn() })),
}));
jest.mock('react-router-dom-v5-compat', () => ({
  ...jest.requireActual('react-router-dom-v5-compat'),
  useSearchParams: jest.fn(),
}));
jest.mock('../hooks/use_kibana');

const mockUseLoadConnectors = useLoadConnectors as jest.Mock;
const mockUseUsageTracker = useUsageTracker as jest.Mock;
const mockUseSearchParams = useSearchParams as jest.Mock;

const renderWithForm = (ui: React.ReactElement) => {
  const Wrapper: React.FC = ({ children }) => {
    return (
      <IntlProvider locale="en">
        <PlaygroundProvider>{children}</PlaygroundProvider>
      </IntlProvider>
    );
  };
  return render(ui, { wrapper: Wrapper });
};

const mockConnectors = {
  '1': { title: 'Connector 1' },
  '2': { title: 'Connector 2' },
};

describe('StartNewChat', () => {
  beforeEach(() => {
    mockUseLoadConnectors.mockReturnValue({ data: [] });
    mockUseUsageTracker.mockReturnValue({ load: jest.fn() });
    mockUseSearchParams.mockReturnValue([new URLSearchParams()]);

    (useKibana as jest.Mock).mockReturnValue({
      services: {
        triggersActionsUi: {
          getAddConnectorFlyout: () => (
            <div data-test-subj="addConnectorFlyout">Add Connector Flyout</div>
          ),
        },
      },
    });
    (useLoadConnectors as jest.Mock).mockReturnValue({
      data: mockConnectors,
      refetch: jest.fn(),
      isLoading: false,
      isSuccess: true,
    });
  });

  it('renders correctly', () => {
    renderWithForm(
      <MemoryRouter>
        <StartNewChat onStartClick={jest.fn()} />
      </MemoryRouter>
    );

    expect(screen.getByTestId('startNewChatTitle')).toBeInTheDocument();
  });

  it('disables the start button when form conditions are not met', () => {
    renderWithForm(
      <MemoryRouter>
        <StartNewChat onStartClick={jest.fn()} />
      </MemoryRouter>
    );

    const startButton = screen.getByTestId('startChatButton');
    expect(startButton).toBeDisabled();
  });

  it('tracks the page load event', () => {
    const usageTracker = { load: jest.fn() };
    mockUseUsageTracker.mockReturnValue(usageTracker);

    renderWithForm(
      <MemoryRouter>
        <StartNewChat onStartClick={jest.fn()} />
      </MemoryRouter>
    );

    expect(usageTracker.load).toHaveBeenCalledWith(AnalyticsEvents.startNewChatPageLoaded);
  });

  it('calls addIndex when default-index is present in searchParams', () => {
    const addIndex = jest.fn();
    (useSourceIndicesFields as jest.Mock).mockReturnValue({ addIndex });
    const searchParams = new URLSearchParams({ 'default-index': 'test-index' });
    mockUseSearchParams.mockReturnValue([searchParams]);

    renderWithForm(
      <MemoryRouter>
        <StartNewChat onStartClick={jest.fn()} />
      </MemoryRouter>
    );

    expect(addIndex).toHaveBeenCalledWith('test-index');
  });
});
