/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { __IntlProvider as IntlProvider } from '@kbn/i18n-react';
import { render, cleanup, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { coreMock } from '@kbn/core/public/mocks';
import { RulesSettingsFlapping } from '@kbn/alerting-plugin/common';
import { RulesSettingsLink } from './rules_settings_link';
import { useKibana } from '../../../common/lib/kibana';
import { getFlappingSettings } from '../../lib/rule_api';
import { updateFlappingSettings } from '../../lib/rule_api';

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
  statusChangeThreshold: 11,
  createdBy: 'test user',
  updatedBy: 'test user',
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
};

const RulesSettingsLinkWithProviders: React.FunctionComponent<{}> = () => (
  <IntlProvider locale="en">
    <QueryClientProvider client={queryClient}>
      <RulesSettingsLink />
    </QueryClientProvider>
  </IntlProvider>
);

describe('rules_settings_link', () => {
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
    getFlappingSettingsMock.mockResolvedValue(mockFlappingSetting);
    updateFlappingSettingsMock.mockResolvedValue(mockFlappingSetting);
  });

  afterEach(() => {
    jest.clearAllMocks();
    queryClient.clear();
    cleanup();
  });

  test('renders the rules setting link correctly', async () => {
    const result = render(<RulesSettingsLinkWithProviders />);
    await waitFor(() => {
      expect(result.getByText('Settings')).toBeInTheDocument();
    });
    expect(result.getByText('Settings')).not.toBeDisabled();
    expect(result.queryByTestId('rulesSettingsModal')).toBe(null);
  });

  test('clicking the settings link opens the rules settings modal', async () => {
    const result = render(<RulesSettingsLinkWithProviders />);
    await waitFor(() => {
      expect(result.queryByTestId('rulesSettingsModal')).toBe(null);
    });

    userEvent.click(result.getByText('Settings'));

    await waitFor(() => {
      expect(result.queryByTestId('rulesSettingsModal')).not.toBe(null);
    });
  });

  test('link is hidden when provided with insufficient read permissions', async () => {
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
        readFlappingSettingsUI: true,
      },
    };

    let result = render(<RulesSettingsLinkWithProviders />);
    await waitFor(() => {
      expect(result.queryByTestId('rulesSettingsLink')).toBe(null);
    });

    useKibanaMock().services.application.capabilities = {
      ...capabilities,
      rulesSettings: {
        save: true,
        show: true,
        writeFlappingSettingsUI: true,
        readFlappingSettingsUI: false,
      },
    };

    result = render(<RulesSettingsLinkWithProviders />);
    await waitFor(() => {
      expect(result.queryByTestId('rulesSettingsLink')).toBe(null);
    });
  });
});
