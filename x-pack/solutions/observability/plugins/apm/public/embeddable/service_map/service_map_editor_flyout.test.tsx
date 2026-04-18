/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { __IntlProvider as IntlProvider } from '@kbn/i18n-react';
import type { CoreStart, CoreSetup } from '@kbn/core/public';
import {
  ServiceMapEditorFlyout,
  type ServiceMapEditorFlyoutProps,
} from './service_map_editor_flyout';
import { ENVIRONMENT_ALL } from '../../../common/environment_filter_values';
import type { EmbeddableDeps } from '../types';

const mockHttpGet = jest.fn().mockResolvedValue({ terms: [] });
const mockCoreStart = {
  http: {
    get: mockHttpGet,
  },
} as unknown as CoreStart;

const mockDeps = {
  coreStart: mockCoreStart,
  pluginsStart: {},
  coreSetup: {} as CoreSetup,
  pluginsSetup: {},
  config: {},
  kibanaEnvironment: {},
  observabilityRuleTypeRegistry: {},
} as unknown as EmbeddableDeps;

async function renderFlyout(props: Partial<ServiceMapEditorFlyoutProps> = {}) {
  const defaultProps: ServiceMapEditorFlyoutProps = {
    onCancel: jest.fn(),
    onSave: jest.fn(),
    ariaLabelledBy: 'flyout-title',
    deps: mockDeps,
  };
  const result = render(
    <IntlProvider locale="en">
      <ServiceMapEditorFlyout {...defaultProps} {...props} />
    </IntlProvider>
  );
  // Wait for initial fetch on mount to complete
  await act(async () => {
    await Promise.resolve();
  });
  return result;
}

describe('<ServiceMapEditorFlyout/>', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
    mockHttpGet.mockResolvedValue({ terms: [] });
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe('when adding a new panel', () => {
    it('displays the add panel title', async () => {
      await renderFlyout();
      expect(screen.getByText('Add service map panel')).toBeInTheDocument();
    });

    it('displays the add panel button', async () => {
      await renderFlyout();
      expect(screen.getByRole('button', { name: 'Add panel' })).toBeInTheDocument();
    });

    it('initializes with default environment selection', async () => {
      await renderFlyout();
      expect(screen.getByTestId('apmServiceMapEditorEnvironmentComboBox')).toBeInTheDocument();
    });
  });

  describe('when editing an existing panel', () => {
    const initialState = {
      environment: 'production' as const,
      kuery: 'service.name: foo',
      serviceName: 'my-service',
    };

    it('displays the edit title', async () => {
      await renderFlyout({ initialState });
      expect(screen.getByText('Edit service map')).toBeInTheDocument();
    });

    it('displays the save button', async () => {
      await renderFlyout({ initialState });
      expect(screen.getByRole('button', { name: 'Save' })).toBeInTheDocument();
    });

    it('renders service name combobox with initial state', async () => {
      await renderFlyout({ initialState });
      expect(screen.getByTestId('apmServiceMapEditorServiceNameComboBox')).toBeInTheDocument();
    });

    it('populates kuery from initial state', async () => {
      await renderFlyout({ initialState });
      expect(screen.getByTestId('apmServiceMapEditorKueryInput')).toHaveValue('service.name: foo');
    });
  });

  describe('when the user submits the form', () => {
    it('calls onSave with default values when no changes made', async () => {
      const onSave = jest.fn();
      await renderFlyout({ onSave });

      fireEvent.click(screen.getByTestId('apmServiceMapEditorSaveButton'));

      await waitFor(() => {
        expect(onSave).toHaveBeenCalledWith({
          environment: ENVIRONMENT_ALL.value,
          kuery: '',
          serviceName: undefined,
        });
      });
    });

    it('calls onSave with kuery value', async () => {
      const onSave = jest.fn();
      await renderFlyout({ onSave });

      fireEvent.change(screen.getByTestId('apmServiceMapEditorKueryInput'), {
        target: { value: 'host.name: server1' },
      });

      fireEvent.click(screen.getByTestId('apmServiceMapEditorSaveButton'));

      await waitFor(() => {
        expect(onSave).toHaveBeenCalledWith({
          environment: ENVIRONMENT_ALL.value,
          kuery: 'host.name: server1',
          serviceName: undefined,
        });
      });
    });
  });

  describe('when the user cancels', () => {
    it('calls onCancel', async () => {
      const onCancel = jest.fn();
      await renderFlyout({ onCancel });

      fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));

      expect(onCancel).toHaveBeenCalled();
    });
  });

  describe('when timeRange is provided', () => {
    it('uses the provided time range for suggestions API calls', async () => {
      const timeRange = { from: '2021-10-10T00:00:00.000Z', to: '2021-10-10T00:15:00.000Z' };
      await renderFlyout({ timeRange });

      const serviceNameComboBox = screen.getByTestId('apmServiceMapEditorServiceNameComboBox');
      const input = serviceNameComboBox.querySelector('input');

      fireEvent.change(input!, { target: { value: 'test-service' } });

      // Advance past debounce
      await act(async () => {
        jest.advanceTimersByTime(300);
      });

      await waitFor(() => {
        expect(mockHttpGet).toHaveBeenCalledWith(
          '/internal/apm/suggestions',
          expect.objectContaining({
            query: expect.objectContaining({
              start: '2021-10-10T00:00:00.000Z',
              end: '2021-10-10T00:15:00.000Z',
            }),
          })
        );
      });
    });
  });

  describe('when timeRange is not provided', () => {
    it('uses default time range for suggestions API calls', async () => {
      await renderFlyout();

      const serviceNameComboBox = screen.getByTestId('apmServiceMapEditorServiceNameComboBox');
      const input = serviceNameComboBox.querySelector('input');

      fireEvent.change(input!, { target: { value: 'test-service' } });

      // Advance past debounce
      await act(async () => {
        jest.advanceTimersByTime(300);
      });

      await waitFor(() => {
        expect(mockHttpGet).toHaveBeenCalledWith(
          '/internal/apm/suggestions',
          expect.objectContaining({
            query: expect.objectContaining({
              start: expect.any(String),
              end: expect.any(String),
            }),
          })
        );
      });
    });
  });

  describe('suggestions loading on mount', () => {
    it('fetches service names on mount', async () => {
      await renderFlyout();

      expect(mockHttpGet).toHaveBeenCalledWith(
        '/internal/apm/suggestions',
        expect.objectContaining({
          query: expect.objectContaining({
            fieldName: 'service.name',
            fieldValue: '',
          }),
        })
      );
    });

    it('fetches environments on mount', async () => {
      await renderFlyout();

      expect(mockHttpGet).toHaveBeenCalledWith(
        '/internal/apm/suggestions',
        expect.objectContaining({
          query: expect.objectContaining({
            fieldName: 'service.environment',
            fieldValue: '',
          }),
        })
      );
    });
  });
});
