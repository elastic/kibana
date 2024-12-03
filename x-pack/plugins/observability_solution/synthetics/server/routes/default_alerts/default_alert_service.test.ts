/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { SanitizedRule } from '@kbn/alerting-types';
import { omit } from 'lodash';
import {
  SYNTHETICS_STATUS_RULE,
  SYNTHETICS_TLS_RULE,
} from '../../../common/constants/synthetics_alerts';
import { DefaultAlertService } from './default_alert_service';
import { DYNAMIC_SETTINGS_DEFAULTS } from '../../constants/settings';

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
      });
      expect(soClient.get).toHaveBeenCalledTimes(1);
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
      service.createDefaultRuleIfNotExist = jest.fn();
      service.settings = {} as any;
      service.getSettings = jest.fn().mockResolvedValue({});
      await service.setupStatusRule();
      expect(service.createDefaultRuleIfNotExist).toHaveBeenCalledWith(
        SYNTHETICS_STATUS_RULE,
        'Synthetics status internal rule',
        '1m'
      );
    });
  });

  describe('setupTlsRule', () => {
    it('creates tls rule if enabled', async () => {
      const service = new DefaultAlertService({} as any, {} as any, {} as any);
      service.getMinimumRuleInterval = jest.fn().mockReturnValue('1m');
      service.createDefaultRuleIfNotExist = jest.fn();
      service.settings = {} as any;
      service.getSettings = jest.fn().mockResolvedValue({});
      await service.setupTlsRule();
      expect(service.createDefaultRuleIfNotExist).toHaveBeenCalledWith(
        SYNTHETICS_TLS_RULE,
        'Synthetics internal TLS rule',
        '1m'
      );
    });
  });

  describe('existing alerts', () => {
    function setUpExistingRules<T extends Record<string, any>>(
      ruleOverride?: Partial<SanitizedRule<T>>,
      getRulesClientMocks = {},
      savedObjectsClientMocks = {}
    ) {
      const savedObjectsClient = {
        get: jest.fn().mockReturnValue({ attributes: {} }),
        ...savedObjectsClientMocks,
      };
      const getRulesClient = jest.fn();
      const mockRule: any = ruleOverride ?? {
        actions: [{ alertsFilter: { query: { kql: 'some kql', filters: [] } } }],
        systemActions: [{ id: 'some system action', actionTypeId: 'actionTypeId', params: {} }],
        ruleTypeId: 'xpack.synthetics.alerts.monitorStatus',
        alertTypeId: 'xpack.synthetics.alerts.monitorStatus',
        id: '123',
      };
      const find = jest.fn();
      find.mockResolvedValue({
        data: [mockRule],
      });
      const bulkDeleteRules = jest.fn();
      getRulesClient.mockReturnValue({ find, bulkDeleteRules, ...getRulesClientMocks });

      return { getRulesClient, mockRule, savedObjectsClient };
    }

    function formatMockRuleResult(mockRule: any) {
      return {
        ...omit(mockRule, 'systemActions'),
        actions: [...mockRule.actions, ...mockRule.systemActions],
      };
    }

    afterEach(() => jest.resetAllMocks());

    describe('getExistingAlert', () => {
      it('returns rule if exists', async () => {
        const { getRulesClient, mockRule } = setUpExistingRules();
        const service = new DefaultAlertService(
          { alerting: { getRulesClient } } as any,
          {} as any,
          {} as any
        );
        const result = await service.getExistingAlert('xpack.synthetics.alerts.monitorStatus');
        expect(result).toEqual(formatMockRuleResult(mockRule));
      });

      it('returns undefined if rule does not exist', async () => {
        const find = jest.fn().mockResolvedValue({ data: [] });
        const getRulesClient = jest.fn();
        getRulesClient.mockReturnValue({ find });
        const service = new DefaultAlertService(
          { alerting: { getRulesClient } } as any,
          {} as any,
          {} as any
        );
        const result = await service.getExistingAlert('xpack.synthetics.alerts.monitorStatus');
        expect(result).toBeUndefined();
      });
    });
    describe('createDefaultAlertIfNotExist', () => {
      it('returns rule if exists', async () => {
        const sampleAction = { alertsFilter: { query: { kql: 'some kql', filters: [] } } };
        const { getRulesClient, mockRule, savedObjectsClient } = setUpExistingRules(
          undefined,
          {
            create: jest.fn().mockResolvedValue({
              actions: [sampleAction],
              systemActions: [
                {
                  actionTypeId: 'actionTypeId',
                  id: 'some system action',
                  params: {},
                },
              ],
              id: '123',
              alertTypeId: 'xpack.synthetics.alerts.monitorStatus',
            }),
          },
          { attributes: { defaultEmail: '' } }
        );
        const getActionsClient = jest.fn();
        getActionsClient.mockReturnValue({
          getAll: jest
            .fn()
            .mockResolvedValue([{ id: 'id', actionTypeId: 'actionTypeId', name: 'action name' }]),
        });
        const service = new DefaultAlertService(
          { actions: { getActionsClient }, alerting: { getRulesClient } } as any,
          {} as any,
          savedObjectsClient as any
        );
        const alert = await service.createDefaultRuleIfNotExist(
          'xpack.synthetics.alerts.monitorStatus',
          'name',
          '1m'
        );
        expect(alert).toEqual(formatMockRuleResult(mockRule));
        expect(getRulesClient).toHaveBeenCalled();
      });

      it('creates rule if does not exist', async () => {
        const sampleAction = { alertsFilter: { query: { kql: 'some kql', filters: [] } } };
        const find = jest.fn().mockResolvedValue({ data: [] });
        const create = jest.fn().mockResolvedValue({
          actions: [sampleAction],
          systemActions: [],
          id: '123',
          alertTypeId: 'testalertid',
        });
        const getActionsClient = jest.fn();
        getActionsClient.mockReturnValue({
          getAll: jest
            .fn()
            .mockResolvedValue([{ id: 'id', actionTypeId: 'actionTypeId', name: 'action name' }]),
        });
        const getRulesClient = jest.fn();
        getRulesClient.mockReturnValue({ find, create });
        const service = new DefaultAlertService(
          { actions: { getActionsClient }, alerting: { getRulesClient } } as any,
          {} as any,
          {} as any
        );
        service.settings = { defaultConnectors: ['slack', 'email'] } as any;
        const result = await service.createDefaultRuleIfNotExist(
          'xpack.synthetics.alerts.monitorStatus',
          'name',
          '1m'
        );
        expect(result).toEqual({
          actions: [sampleAction],
          id: '123',
          alertTypeId: 'testalertid',
          ruleTypeId: 'testalertid',
        });
      });
    });

    function setUpUpdateTest<T extends Record<string, any>>(mockRule?: Partial<SanitizedRule<T>>) {
      const update = jest.fn().mockResolvedValue({
        alertTypeId: 'test-alert-type-id',
        actions: [{ id: 'id', actionTypeId: 'actionTypeId', name: 'action name' }],
        systemActions: [{ id: 'sys-id', actionTypeId: 'actionTypeId', name: 'action name' }],
        updatedAlertField: 'value',
      });
      const { getRulesClient } = setUpExistingRules(mockRule ?? { schedule: { interval: '1m' } }, {
        update,
      });
      const getConfig = jest.fn().mockReturnValue({ minimumScheduleInterval: { value: '3m' } });
      const server = {
        alerting: {
          getConfig,
        },
      } as any;
      const getActionsClient = jest.fn();
      const getAll = jest
        .fn()
        .mockResolvedValue([{ id: 'id', actionTypeId: 'actionTypeId', name: 'action name' }]);
      getActionsClient.mockReturnValue({
        getAll,
      });
      const context = { actions: { getActionsClient }, alerting: { getRulesClient } };

      return {
        context,
        server,
        mocks: { update, getRulesClient, getConfig, getActionsClient, getAll },
      };
    }

    describe('updateStatusRule', () => {
      it('updates the rule if it is enabled', async () => {
        const {
          context,
          server,
          mocks: { update, getAll },
        } = setUpUpdateTest({
          id: 'test-alert-id',
          name: 'test-alert-name',
          tags: ['test-alert-tags'],
          schedule: { interval: '1m' },
          params: { param: 'value' },
        });
        const service = new DefaultAlertService(context as any, server as any, {} as any);
        service.settings = { defaultConnectors: ['slack', 'email'] } as any;
        const result = await service.updateStatusRule();
        expect(result).toEqual({
          actions: [
            { actionTypeId: 'actionTypeId', id: 'id', name: 'action name' },
            { actionTypeId: 'actionTypeId', id: 'sys-id', name: 'action name' },
          ],
          alertTypeId: 'test-alert-type-id',
          ruleTypeId: 'test-alert-type-id',
          updatedAlertField: 'value',
        });
        expect(update).toHaveBeenCalledTimes(1);
        expect(update.mock.calls[0][0]).toEqual({
          data: {
            actions: [],
            name: 'test-alert-name',
            params: { param: 'value' },
            schedule: { interval: '3m' },
            tags: ['test-alert-tags'],
          },
          id: 'test-alert-id',
        });
        expect(getAll).toHaveBeenCalled();
      });
    });

    describe('updateTlsRule', () => {
      it('updates the rule if it is enabled', async () => {
        const { context, server } = setUpUpdateTest();
        const service = new DefaultAlertService(context as any, server as any, {} as any);
        service.settings = { defaultConnectors: ['slack', 'email'] } as any;
        const result = await service.updateTlsRule();
        expect(result).toEqual({
          actions: [
            { actionTypeId: 'actionTypeId', id: 'id', name: 'action name' },
            { actionTypeId: 'actionTypeId', id: 'sys-id', name: 'action name' },
          ],
          alertTypeId: 'test-alert-type-id',
          ruleTypeId: 'test-alert-type-id',
          updatedAlertField: 'value',
        });
      });

      it('creates the rule if it does not exist', async () => {
        const { context, server } = setUpUpdateTest();
        const service = new DefaultAlertService(context as any, server as any, {} as any);
        service.settings = { defaultConnectors: ['slack', 'email'] } as any;
        const getExistingAlertMock = jest.fn().mockResolvedValue(undefined);
        service.getExistingAlert = getExistingAlertMock;
        const createDefaultAlertIfNotExistMock = jest.fn();
        service.createDefaultRuleIfNotExist = createDefaultAlertIfNotExistMock;
        const result = await service.updateTlsRule();
        expect(result).toBeUndefined();
        expect(service.getExistingAlert).toHaveBeenCalled();
        expect(service.createDefaultRuleIfNotExist).toHaveBeenCalled();
        expect(getExistingAlertMock.mock.calls[0][0]).toBe('xpack.synthetics.alerts.tls');
        expect(createDefaultAlertIfNotExistMock.mock.calls[0]).toStrictEqual([
          'xpack.synthetics.alerts.tls',
          'Synthetics internal TLS rule',
          '3m',
        ]);
      });
    });
  });

  describe('getActionConnectors', () => {
    it('fetches settings if not set', async () => {
      const getActionsClient = jest.fn();
      const getAll = jest.fn().mockResolvedValue([{ id: 'id', actionTypeId: 'actionTypeId' }]);
      getActionsClient.mockReturnValue({
        getAll,
      });
      const service = new DefaultAlertService(
        { actions: { getActionsClient } } as any,
        {} as any,
        { get: jest.fn() } as any
      );
      const connectors = await service.getActionConnectors();
      expect(connectors).toEqual({
        actionConnectors: [{ id: 'id', actionTypeId: 'actionTypeId' }],
        settings: {
          ...DYNAMIC_SETTINGS_DEFAULTS,
        },
      });
      expect(getAll).toHaveBeenCalled();
    });
  });
});
