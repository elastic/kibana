/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { __IntlProvider as IntlProvider } from '@kbn/i18n-react';
import { act } from 'react-dom/test-utils';
import { render } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { coreMock } from '@kbn/core/public/mocks';
import { RulesSettingsFlapping } from '@kbn/alerting-plugin/common';
import { RulesSettingsLink } from './rules_settings_link';
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

const RulesSettingsLinkWithLocale: React.FunctionComponent<{}> = () => (
  <IntlProvider locale="en">
    <RulesSettingsLink />
  </IntlProvider>
);

describe('rules_settings_link', () => {
  beforeEach(async () => {
    jest.clearAllMocks();
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

  test('renders the rules setting link correctly', async () => {
    const result = render(<RulesSettingsLinkWithLocale />);
    await act(() => Promise.resolve());

    expect(result.getByText('Settings')).toBeInTheDocument();
    expect(result.getByText('Settings')).not.toBeDisabled();
    expect(result.queryByTestId('rulesSettingsModal')).toBe(null);
  });

  test('clicking the settings link opens the rules settings modal', async () => {
    const result = render(<RulesSettingsLinkWithLocale />);
    await act(() => Promise.resolve());

    expect(result.queryByTestId('rulesSettingsModal')).toBe(null);
    userEvent.click(result.getByText('Settings'));
    await act(() => Promise.resolve());
    expect(result.queryByTestId('rulesSettingsModal')).not.toBe(null);
  });

  test('link is disabled when provided with insufficient read permissions', async () => {
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

    const result = render(<RulesSettingsLinkWithLocale />);
    await act(() => Promise.resolve());
    expect(result.getByTestId('rulesSettingsLink')).toBeDisabled();
  });
});
