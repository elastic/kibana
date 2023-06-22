/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { __IntlProvider as IntlProvider } from '@kbn/i18n-react';
import { render, fireEvent, cleanup, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { coreMock } from '@kbn/core/public/mocks';
import { IToasts } from '@kbn/core/public';
import { RulesSettingsFlapping } from '@kbn/alerting-plugin/common';
import { RulesSettingsModal, RulesSettingsModalProps } from './rules_settings_modal';
import { useKibana } from '../../../common/lib/kibana';
import { getFlappingSettings } from '../../lib/rule_api/get_flapping_settings';
import { updateFlappingSettings } from '../../lib/rule_api/update_flapping_settings';

jest.mock('../../../common/lib/kibana');
jest.mock('../../lib/rule_api/get_flapping_settings', () => ({
  getFlappingSettings: jest.fn(),
}));
jest.mock('../../lib/rule_api/update_flapping_settings', () => ({
  updateFlappingSettings: jest.fn(),
}));

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: false,
      cacheTime: 0,
    },
  },
});

const useKibanaMock = useKibana as jest.Mocked<typeof useKibana>;

const mocks = coreMock.createSetup();

const getFlappingSettingsMock = getFlappingSettings as unknown as jest.MockedFunction<
  typeof getFlappingSettings
>;
const updateFlappingSettingsMock = updateFlappingSettings as unknown as jest.MockedFunction<
  typeof updateFlappingSettings
>;

const mockFlappingSetting: RulesSettingsFlapping = {
  enabled: true,
  lookBackWindow: 10,
  statusChangeThreshold: 10,
  createdBy: 'test user',
  updatedBy: 'test user',
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
};

const modalProps: RulesSettingsModalProps = {
  isVisible: true,
  setUpdatingRulesSettings: jest.fn(),
  onClose: jest.fn(),
  onSave: jest.fn(),
};

const RulesSettingsModalWithProviders: React.FunctionComponent<RulesSettingsModalProps> = (
  props
) => (
  <IntlProvider locale="en">
    <QueryClientProvider client={queryClient}>
      <RulesSettingsModal {...props} />
    </QueryClientProvider>
  </IntlProvider>
);

describe('rules_settings_modal', () => {
  beforeEach(async () => {
    const [
      {
        application: { capabilities },
      },
    ] = await mocks.getStartServices();
    useKibanaMock().services.application.capabilities = {
      ...capabilities,
      rulesSettings: {
        save: true,
        show: true,
        writeFlappingSettingsUI: true,
        readFlappingSettingsUI: true,
      },
    };

    useKibanaMock().services.notifications.toasts = {
      addSuccess: jest.fn(),
      addError: jest.fn(),
      addDanger: jest.fn(),
      addWarning: jest.fn(),
    } as unknown as IToasts;

    getFlappingSettingsMock.mockResolvedValue(mockFlappingSetting);
    updateFlappingSettingsMock.mockResolvedValue(mockFlappingSetting);
  });

  afterEach(() => {
    jest.clearAllMocks();
    queryClient.clear();
    cleanup();
  });

  test('renders flapping settings correctly', async () => {
    const result = render(<RulesSettingsModalWithProviders {...modalProps} />);
    expect(getFlappingSettingsMock).toHaveBeenCalledTimes(1);
    await waitFor(() => {
      expect(result.queryByTestId('centerJustifiedSpinner')).toBe(null);
    });
    expect(result.getByTestId('rulesSettingsModalEnableSwitch').getAttribute('aria-checked')).toBe(
      'true'
    );
    expect(result.getByTestId('lookBackWindowRangeInput').getAttribute('value')).toBe('10');
    expect(result.getByTestId('statusChangeThresholdRangeInput').getAttribute('value')).toBe('10');

    expect(result.getByTestId('rulesSettingsModalCancelButton')).toBeInTheDocument();
    expect(result.getByTestId('rulesSettingsModalSaveButton').getAttribute('disabled')).toBeFalsy();
  });

  test('can save flapping settings', async () => {
    const result = render(<RulesSettingsModalWithProviders {...modalProps} />);
    await waitFor(() => {
      expect(result.queryByTestId('centerJustifiedSpinner')).toBe(null);
    });

    const lookBackWindowInput = result.getByTestId('lookBackWindowRangeInput');
    const statusChangeThresholdInput = result.getByTestId('statusChangeThresholdRangeInput');

    fireEvent.change(lookBackWindowInput, { target: { value: 20 } });
    fireEvent.change(statusChangeThresholdInput, { target: { value: 5 } });

    expect(lookBackWindowInput.getAttribute('value')).toBe('20');
    expect(statusChangeThresholdInput.getAttribute('value')).toBe('5');

    // Try saving
    userEvent.click(result.getByTestId('rulesSettingsModalSaveButton'));

    await waitFor(() => {
      expect(modalProps.setUpdatingRulesSettings).toHaveBeenCalledWith(true);
    });
    expect(modalProps.onClose).toHaveBeenCalledTimes(1);
    expect(updateFlappingSettingsMock).toHaveBeenCalledWith(
      expect.objectContaining({
        flappingSettings: {
          enabled: true,
          lookBackWindow: 20,
          statusChangeThreshold: 5,
        },
      })
    );
    expect(useKibanaMock().services.notifications.toasts.addSuccess).toHaveBeenCalledTimes(1);
    expect(modalProps.setUpdatingRulesSettings).toHaveBeenCalledWith(true);
    expect(modalProps.onSave).toHaveBeenCalledTimes(1);
  });

  test('should prevent statusChangeThreshold from being greater than lookBackWindow', async () => {
    const result = render(<RulesSettingsModalWithProviders {...modalProps} />);
    await waitFor(() => {
      expect(result.queryByTestId('centerJustifiedSpinner')).toBe(null);
    });

    const lookBackWindowInput = result.getByTestId('lookBackWindowRangeInput');
    const statusChangeThresholdInput = result.getByTestId('statusChangeThresholdRangeInput');

    // Change lookBackWindow to a smaller value
    fireEvent.change(lookBackWindowInput, { target: { value: 5 } });
    // statusChangeThresholdInput gets pinned to be 5
    expect(statusChangeThresholdInput.getAttribute('value')).toBe('5');

    // Try making statusChangeThreshold bigger
    fireEvent.change(statusChangeThresholdInput, { target: { value: 20 } });
    // Still pinned
    expect(statusChangeThresholdInput.getAttribute('value')).toBe('5');

    fireEvent.change(statusChangeThresholdInput, { target: { value: 3 } });
    expect(statusChangeThresholdInput.getAttribute('value')).toBe('3');
  });

  test('handles errors when saving settings', async () => {
    updateFlappingSettingsMock.mockRejectedValue('failed!');

    const result = render(<RulesSettingsModalWithProviders {...modalProps} />);
    await waitFor(() => {
      expect(result.queryByTestId('centerJustifiedSpinner')).toBe(null);
    });

    // Try saving
    userEvent.click(result.getByTestId('rulesSettingsModalSaveButton'));
    await waitFor(() => {
      expect(modalProps.setUpdatingRulesSettings).toHaveBeenCalledWith(true);
    });
    expect(modalProps.onClose).toHaveBeenCalledTimes(1);
    expect(useKibanaMock().services.notifications.toasts.addDanger).toHaveBeenCalledTimes(1);
    expect(modalProps.setUpdatingRulesSettings).toHaveBeenCalledWith(true);
    expect(modalProps.onSave).toHaveBeenCalledTimes(1);
  });

  test('displays flapping detection off prompt when flapping is disabled', async () => {
    const result = render(<RulesSettingsModalWithProviders {...modalProps} />);
    await waitFor(() => {
      expect(result.queryByTestId('centerJustifiedSpinner')).toBe(null);
    });

    expect(result.queryByTestId('rulesSettingsModalFlappingOffPrompt')).toBe(null);
    userEvent.click(result.getByTestId('rulesSettingsModalEnableSwitch'));
    expect(result.queryByTestId('rulesSettingsModalFlappingOffPrompt')).not.toBe(null);
  });

  test('form elements are disabled when provided with insufficient write permissions', async () => {
    const [
      {
        application: { capabilities },
      },
    ] = await mocks.getStartServices();
    useKibanaMock().services.application.capabilities = {
      ...capabilities,
      rulesSettings: {
        save: true,
        show: true,
        writeFlappingSettingsUI: false,
        readFlappingSettingsUI: true,
      },
    };
    const result = render(<RulesSettingsModalWithProviders {...modalProps} />);
    await waitFor(() => {
      expect(result.queryByTestId('centerJustifiedSpinner')).toBe(null);
    });

    expect(result.getByTestId('rulesSettingsModalEnableSwitch')).toBeDisabled();
    expect(result.getByTestId('lookBackWindowRangeInput')).toBeDisabled();
    expect(result.getByTestId('statusChangeThresholdRangeInput')).toBeDisabled();
    expect(result.getByTestId('rulesSettingsModalSaveButton')).toBeDisabled();
  });

  test('form elements are not visible when provided with insufficient read permissions', async () => {
    const [
      {
        application: { capabilities },
      },
    ] = await mocks.getStartServices();
    useKibanaMock().services.application.capabilities = {
      ...capabilities,
      rulesSettings: {
        save: true,
        show: false,
        writeFlappingSettingsUI: true,
        readFlappingSettingsUI: false,
      },
    };

    const result = render(<RulesSettingsModalWithProviders {...modalProps} />);
    await waitFor(() => {
      expect(result.queryByTestId('centerJustifiedSpinner')).toBe(null);
    });

    expect(result.getByTestId('rulesSettingsErrorPrompt')).toBeInTheDocument();
  });
});
