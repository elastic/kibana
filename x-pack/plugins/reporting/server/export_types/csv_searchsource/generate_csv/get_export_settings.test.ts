/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  UI_SETTINGS_DATEFORMAT_TZ,
  UI_SETTINGS_CSV_QUOTE_VALUES,
  UI_SETTINGS_CSV_SEPARATOR,
  UI_SETTINGS_SEARCH_INCLUDE_FROZEN,
} from '../../../../common/constants';
import { IUiSettingsClient } from 'kibana/server';
import {
  loggingSystemMock,
  savedObjectsClientMock,
  uiSettingsServiceMock,
} from 'src/core/server/mocks';
import { createMockConfig, createMockConfigSchema } from '../../../test_helpers';
import { getExportSettings } from './get_export_settings';

describe('getExportSettings', () => {
  let uiSettingsClient: IUiSettingsClient;
  const config = createMockConfig(createMockConfigSchema({}));
  const logger = loggingSystemMock.createLogger();

  beforeEach(() => {
    uiSettingsClient = uiSettingsServiceMock
      .createStartContract()
      .asScopedToClient(savedObjectsClientMock.create());
    uiSettingsClient.get = jest.fn().mockImplementation((key: string) => {
      switch (key) {
        case UI_SETTINGS_CSV_QUOTE_VALUES:
          return true;
        case UI_SETTINGS_CSV_SEPARATOR:
          return ',';
        case UI_SETTINGS_DATEFORMAT_TZ:
          return 'Browser';
        case UI_SETTINGS_SEARCH_INCLUDE_FROZEN:
          return false;
      }

      return 'helo world';
    });
  });

  test('getExportSettings: returns the expected result', async () => {
    expect(await getExportSettings(uiSettingsClient, config, '', logger)).toMatchInlineSnapshot(`
      Object {
        "bom": "",
        "checkForFormulas": undefined,
        "escapeFormulaValues": undefined,
        "escapeValue": [Function],
        "includeFrozen": false,
        "maxSizeBytes": undefined,
        "scroll": Object {
          "duration": undefined,
          "size": undefined,
        },
        "separator": ",",
        "timezone": "UTC",
      }
    `);
  });

  test('escapeValue function', async () => {
    const { escapeValue } = await getExportSettings(uiSettingsClient, config, '', logger);
    expect(escapeValue(`test`)).toBe(`test`);
    expect(escapeValue(`this is, a test`)).toBe(`"this is, a test"`);
    expect(escapeValue(`"tet"`)).toBe(`"""tet"""`);
    expect(escapeValue(`@foo`)).toBe(`"@foo"`);
  });

  test('non-default timezone', async () => {
    uiSettingsClient.get = jest.fn().mockImplementation((key: string) => {
      switch (key) {
        case UI_SETTINGS_DATEFORMAT_TZ:
          return `America/Aruba`;
      }
    });

    expect(
      await getExportSettings(uiSettingsClient, config, '', logger).then(({ timezone }) => timezone)
    ).toBe(`America/Aruba`);
  });
});
