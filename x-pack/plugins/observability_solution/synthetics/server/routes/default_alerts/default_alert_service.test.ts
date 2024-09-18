/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  SYNTHETICS_STATUS_RULE,
  SYNTHETICS_TLS_RULE,
} from '../../../common/constants/synthetics_alerts';
import { DefaultAlertService } from './default_alert_service';

describe('DefaultAlertService', () => {
  describe('getSettings', () => {
    const expectedSettings = {
      certAgeThreshold: 50,
      certExpirationThreshold: 10,
      defaultConnectors: ['slack', 'email'],
    };
    const soResponse = { attributes: { ...expectedSettings } };
    it('returns settings if already set', async () => {
      const soClient = { get: jest.fn() } as any;
      const service = new DefaultAlertService({} as any, {} as any, soClient);
      service.settings = expectedSettings;
      const settings = await service.getSettings();
      expect(settings).toEqual(expectedSettings);
      expect(soClient.get).not.toHaveBeenCalled();
    });

    it('fetches settings if not set', async () => {
      const soClient = { get: jest.fn() } as any;
      const service = new DefaultAlertService({} as any, {} as any, soClient);
      soClient.get.mockResolvedValueOnce(soResponse);
      const settings = await service.getSettings();
      expect(settings).toEqual({
        ...expectedSettings,
        defaultEmail: undefined,
        defaultStatusRuleEnabled: true,
        defaultTLSRuleEnabled: true,
      });
      expect(soClient.get).toHaveBeenCalledTimes(1);
    });
  });

  describe('setupDefaultAlerts', () => {
    afterEach(() => jest.resetAllMocks());

    it('sets up status and tls rules', async () => {
      const soClient = { get: jest.fn() } as any;
      const service = new DefaultAlertService({} as any, {} as any, soClient);
      service.getSettings = jest.fn().mockResolvedValue({
        certAgeThreshold: 50,
        certExpirationThreshold: 10,
        defaultConnectors: ['slack', 'email'],
        defaultEmail: undefined,
        defaultStatusRuleEnabled: true,
        defaultTLSRuleEnabled: true,
      });
      const setupStatusRule = jest.fn();
      const setupTlsRule = jest.fn();
      service.setupStatusRule = setupStatusRule;
      service.setupTlsRule = setupTlsRule;
      setupStatusRule.mockResolvedValueOnce({ status: 'fulfilled', value: {} });
      setupTlsRule.mockResolvedValueOnce({ status: 'fulfilled', value: {} });
      const result = await service.setupDefaultAlerts();
      expect(setupStatusRule).toHaveBeenCalledTimes(1);
      expect(setupTlsRule).toHaveBeenCalledTimes(1);
      expect(result).toEqual({
        statusRule: { status: 'fulfilled', value: {} },
        tlsRule: { status: 'fulfilled', value: {} },
      });
    });
    it('returns null rules if value is falsy', async () => {
      const soClient = { get: jest.fn() } as any;
      const service = new DefaultAlertService({} as any, {} as any, soClient);
      service.getSettings = jest.fn().mockResolvedValue({
        certAgeThreshold: 50,
        certExpirationThreshold: 10,
        defaultConnectors: ['slack', 'email'],
        defaultEmail: undefined,
        defaultStatusRuleEnabled: true,
        defaultTLSRuleEnabled: true,
      });
      const setupStatusRule = jest.fn();
      const setupTlsRule = jest.fn();
      service.setupStatusRule = setupStatusRule;
      service.setupTlsRule = setupTlsRule;
      setupStatusRule.mockResolvedValueOnce(undefined);
      setupTlsRule.mockResolvedValueOnce(undefined);
      const result = await service.setupDefaultAlerts();
      expect(setupStatusRule).toHaveBeenCalledTimes(1);
      expect(setupTlsRule).toHaveBeenCalledTimes(1);
      expect(result).toEqual({
        statusRule: null,
        tlsRule: null,
      });
    });
  });

  describe('getMinimumRuleInterval', () => {
    it('returns 1m if minimum interval is less than 1m', () => {
      const server = {
        alerting: { getConfig: () => ({ minimumScheduleInterval: { value: '30s' } }) },
      } as any;
      const service = new DefaultAlertService({} as any, server, {} as any);
      expect(service.getMinimumRuleInterval()).toBe('1m');
    });

    it('returns minimum interval if greater than 1m', () => {
      const server = {
        alerting: { getConfig: () => ({ minimumScheduleInterval: { value: '5m' } }) },
      } as any;
      const service = new DefaultAlertService({} as any, server, {} as any);
      expect(service.getMinimumRuleInterval()).toBe('5m');
    });
  });

  describe('setupStatusRule', () => {
    it('creates status rule if enabled', async () => {
      const service = new DefaultAlertService({} as any, {} as any, {} as any);
      service.getMinimumRuleInterval = jest.fn().mockReturnValue('1m');
      service.createDefaultAlertIfNotExist = jest.fn();
      service.settings = { defaultStatusRuleEnabled: true } as any;
      service.getSettings = jest.fn().mockResolvedValue({
        defaultStatusRuleEnabled: true,
      });
      await service.setupStatusRule();
      expect(service.createDefaultAlertIfNotExist).toHaveBeenCalledWith(
        SYNTHETICS_STATUS_RULE,
        'Synthetics status internal rule',
        '1m'
      );
    });

    it('does not create status rule if disabled', async () => {
      const service = new DefaultAlertService({} as any, {} as any, {} as any);
      service.getMinimumRuleInterval = jest.fn().mockReturnValue('1m');
      service.createDefaultAlertIfNotExist = jest.fn();
      service.settings = { defaultStatusRuleEnabled: false } as any;
      const result = await service.setupStatusRule();
      expect(service.createDefaultAlertIfNotExist).not.toHaveBeenCalled();
      expect(result).toBeUndefined();
    });
  });

  describe('setupTlsRule', () => {
    it('creates tls rule if enabled', async () => {
      const service = new DefaultAlertService({} as any, {} as any, {} as any);
      service.getMinimumRuleInterval = jest.fn().mockReturnValue('1m');
      service.createDefaultAlertIfNotExist = jest.fn();
      service.settings = { defaultTlsRuleEnabled: true } as any;
      service.getSettings = jest.fn().mockResolvedValue({
        defaultTlsRuleEnabled: true,
      });
      await service.setupTlsRule();
      expect(service.createDefaultAlertIfNotExist).toHaveBeenCalledWith(
        SYNTHETICS_TLS_RULE,
        'Synthetics internal TLS rule',
        '1m'
      );
    });

    it('does not create tls rule if disabled', async () => {
      const service = new DefaultAlertService({} as any, {} as any, {} as any);
      service.getMinimumRuleInterval = jest.fn().mockReturnValue('1m');
      service.createDefaultAlertIfNotExist = jest.fn();
      service.settings = { defaultTLSRuleEnabled: false } as any;
      const result = await service.setupTlsRule();
      expect(service.createDefaultAlertIfNotExist).not.toHaveBeenCalled();
      expect(result).toBeUndefined();
    });
  });
});
