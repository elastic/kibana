/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import sinon from 'sinon';
import { KibanaRequest } from '@kbn/core/server';
import { rulesSettingsClientMock } from './rules_settings_client.mock';
import { RulesSettingsService } from './rules_settings_service';
import { DEFAULT_QUERY_DELAY_SETTINGS, DEFAULT_SERVERLESS_QUERY_DELAY_SETTINGS } from '../types';

const fakeRequest = {
  headers: {},
  getBasePath: () => '',
  path: '/',
  route: { settings: {} },
  url: {
    href: '/',
  },
  raw: {
    req: {
      url: '/',
    },
  },
  getSavedObjectsClient: jest.fn(),
} as unknown as KibanaRequest;
let fakeTimer: sinon.SinonFakeTimers;

describe('RulesSettingsService', () => {
  beforeAll(() => {
    fakeTimer = sinon.useFakeTimers(new Date('2023-02-27T08:15:00.000Z'));
  });
  beforeEach(() => {
    fakeTimer.reset();
  });
  afterAll(() => fakeTimer.restore());

  for (const isServerless of [false, true]) {
    const label = isServerless ? 'serverless' : 'non-serverless';
    describe(`getSettings in ${label}`, () => {
      afterEach(() => {
        jest.resetAllMocks();
        jest.clearAllMocks();
      });

      test('should fetch settings if none in cache', async () => {
        const rulesSettingsClient = rulesSettingsClientMock.create();
        const rulesSettingsService = new RulesSettingsService({
          isServerless,
          getRulesSettingsClientWithRequest: jest.fn().mockReturnValue(rulesSettingsClient),
        });
        // @ts-ignore - accessing private variable
        expect(rulesSettingsService.settingsLastUpdated.get('default')).toBeUndefined();
        // @ts-ignore - accessing private variable
        expect(rulesSettingsService.queryDelaySettings.get('default')).toBeUndefined();
        // @ts-ignore - accessing private variable
        expect(rulesSettingsService.flappingSettings.get('default')).toBeUndefined();

        const settings = await rulesSettingsService.getSettings(fakeRequest, 'default');
        expect(rulesSettingsClient.queryDelay().get).toHaveBeenCalledTimes(1);
        expect(rulesSettingsClient.flapping().get).toHaveBeenCalledTimes(1);

        // @ts-ignore - accessing private variable
        expect(rulesSettingsService.settingsLastUpdated.get('default')).toEqual(1677485700000);
        // @ts-ignore - accessing private variable
        expect(rulesSettingsService.queryDelaySettings.get('default')).toEqual({ delay: 0 });
        // @ts-ignore - accessing private variable
        expect(rulesSettingsService.flappingSettings.get('default')).toEqual({
          enabled: true,
          lookBackWindow: 20,
          statusChangeThreshold: 4,
        });

        expect(settings.queryDelaySettings).toEqual({ delay: 0 });
        expect(settings.flappingSettings).toEqual({
          enabled: true,
          lookBackWindow: 20,
          statusChangeThreshold: 4,
        });
      });

      test('should return defaults if fetch settings errors and nothing in cache', async () => {
        const rulesSettingsClient = rulesSettingsClientMock.create();
        (rulesSettingsClient.queryDelay().get as jest.Mock).mockImplementationOnce(() => {
          throw new Error('no!');
        });

        const rulesSettingsService = new RulesSettingsService({
          isServerless,
          getRulesSettingsClientWithRequest: jest.fn().mockReturnValue(rulesSettingsClient),
        });

        // @ts-ignore - accessing private variable
        expect(rulesSettingsService.settingsLastUpdated.get('default')).toBeUndefined();
        // @ts-ignore - accessing private variable
        expect(rulesSettingsService.queryDelaySettings.get('default')).toBeUndefined();
        // @ts-ignore - accessing private variable
        expect(rulesSettingsService.flappingSettings.get('default')).toBeUndefined();

        const settings = await rulesSettingsService.getSettings(fakeRequest, 'default');
        expect(rulesSettingsClient.queryDelay().get).toHaveBeenCalledTimes(1);
        expect(rulesSettingsClient.flapping().get).toHaveBeenCalledTimes(0);

        // @ts-ignore - accessing private variable
        expect(rulesSettingsService.settingsLastUpdated.get('default')).toBeUndefined();
        // @ts-ignore - accessing private variable
        expect(rulesSettingsService.queryDelaySettings.get('default')).toBeUndefined();
        // @ts-ignore - accessing private variable
        expect(rulesSettingsService.flappingSettings.get('default')).toBeUndefined();

        expect(settings.queryDelaySettings).toEqual(
          isServerless ? DEFAULT_SERVERLESS_QUERY_DELAY_SETTINGS : DEFAULT_QUERY_DELAY_SETTINGS
        );
        expect(settings.flappingSettings).toEqual({
          enabled: true,
          lookBackWindow: 20,
          statusChangeThreshold: 4,
        });
      });

      test('should fetch settings per space', async () => {
        const rulesSettingsClient = rulesSettingsClientMock.create();
        (rulesSettingsClient.queryDelay().get as jest.Mock).mockResolvedValueOnce({ delay: 13 });
        const rulesSettingsService = new RulesSettingsService({
          isServerless,
          getRulesSettingsClientWithRequest: jest.fn().mockReturnValue(rulesSettingsClient),
        });
        // @ts-ignore - accessing private variable
        expect(rulesSettingsService.settingsLastUpdated.get('default')).toBeUndefined();
        // @ts-ignore - accessing private variable
        expect(rulesSettingsService.queryDelaySettings.get('default')).toBeUndefined();
        // @ts-ignore - accessing private variable
        expect(rulesSettingsService.flappingSettings.get('default')).toBeUndefined();

        // @ts-ignore - accessing private variable
        expect(rulesSettingsService.settingsLastUpdated.get('new-space')).toBeUndefined();
        // @ts-ignore - accessing private variable
        expect(rulesSettingsService.queryDelaySettings.get('new-space')).toBeUndefined();
        // @ts-ignore - accessing private variable
        expect(rulesSettingsService.flappingSettings.get('new-space')).toBeUndefined();

        const settingsDefault = await rulesSettingsService.getSettings(fakeRequest, 'default');
        const settingsNewSpace = await rulesSettingsService.getSettings(fakeRequest, 'new-space');
        expect(rulesSettingsClient.queryDelay().get).toHaveBeenCalledTimes(2);
        expect(rulesSettingsClient.flapping().get).toHaveBeenCalledTimes(2);

        // @ts-ignore - accessing private variable
        expect(rulesSettingsService.settingsLastUpdated.get('default')).toEqual(1677485700000);
        // @ts-ignore - accessing private variable
        expect(rulesSettingsService.queryDelaySettings.get('default')).toEqual({ delay: 13 });
        // @ts-ignore - accessing private variable
        expect(rulesSettingsService.flappingSettings.get('default')).toEqual({
          enabled: true,
          lookBackWindow: 20,
          statusChangeThreshold: 4,
        });
        // @ts-ignore - accessing private variable
        expect(rulesSettingsService.settingsLastUpdated.get('new-space')).toEqual(1677485700000);
        // @ts-ignore - accessing private variable
        expect(rulesSettingsService.queryDelaySettings.get('new-space')).toEqual({ delay: 0 });
        // @ts-ignore - accessing private variable
        expect(rulesSettingsService.flappingSettings.get('new-space')).toEqual({
          enabled: true,
          lookBackWindow: 20,
          statusChangeThreshold: 4,
        });

        expect(settingsNewSpace.queryDelaySettings).toEqual({ delay: 0 });
        expect(settingsNewSpace.flappingSettings).toEqual({
          enabled: true,
          lookBackWindow: 20,
          statusChangeThreshold: 4,
        });

        expect(settingsDefault.queryDelaySettings).toEqual({ delay: 13 });
        expect(settingsDefault.flappingSettings).toEqual({
          enabled: true,
          lookBackWindow: 20,
          statusChangeThreshold: 4,
        });
      });

      test('should use cached settings if cache has not expired', async () => {
        const rulesSettingsClient = rulesSettingsClientMock.create();
        const rulesSettingsService = new RulesSettingsService({
          isServerless,
          getRulesSettingsClientWithRequest: jest.fn().mockReturnValue(rulesSettingsClient),
        });

        const settings1 = await rulesSettingsService.getSettings(fakeRequest, 'default');
        fakeTimer.tick(30000);
        const settings2 = await rulesSettingsService.getSettings(fakeRequest, 'default');

        expect(rulesSettingsClient.queryDelay().get).toHaveBeenCalledTimes(1);
        expect(rulesSettingsClient.flapping().get).toHaveBeenCalledTimes(1);

        expect(settings1.queryDelaySettings).toEqual({ delay: 0 });
        expect(settings1.flappingSettings).toEqual({
          enabled: true,
          lookBackWindow: 20,
          statusChangeThreshold: 4,
        });
        expect(settings1).toEqual(settings2);
      });

      test('should refetch settings if cache has expired', async () => {
        const rulesSettingsClient = rulesSettingsClientMock.create();
        const rulesSettingsService = new RulesSettingsService({
          isServerless,
          getRulesSettingsClientWithRequest: jest.fn().mockReturnValue(rulesSettingsClient),
        });

        await rulesSettingsService.getSettings(fakeRequest, 'default');
        fakeTimer.tick(61000);
        await rulesSettingsService.getSettings(fakeRequest, 'default');

        expect(rulesSettingsClient.queryDelay().get).toHaveBeenCalledTimes(2);
        expect(rulesSettingsClient.flapping().get).toHaveBeenCalledTimes(2);
      });

      test('should return cached settings if refetching throws an error', async () => {
        const rulesSettingsClient = rulesSettingsClientMock.create();
        (rulesSettingsClient.queryDelay().get as jest.Mock).mockResolvedValueOnce({ delay: 13 });
        (rulesSettingsClient.queryDelay().get as jest.Mock).mockImplementationOnce(() => {
          throw new Error('no!');
        });
        const rulesSettingsService = new RulesSettingsService({
          isServerless,
          getRulesSettingsClientWithRequest: jest.fn().mockReturnValue(rulesSettingsClient),
        });

        const settings1 = await rulesSettingsService.getSettings(fakeRequest, 'default');
        fakeTimer.tick(61000);
        const settings2 = await rulesSettingsService.getSettings(fakeRequest, 'default');

        expect(rulesSettingsClient.queryDelay().get).toHaveBeenCalledTimes(2);

        expect(settings1.queryDelaySettings).toEqual({ delay: 13 });
        expect(settings1.flappingSettings).toEqual({
          enabled: true,
          lookBackWindow: 20,
          statusChangeThreshold: 4,
        });
        expect(settings1).toEqual(settings2);
      });
    });
  }
});
