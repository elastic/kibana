/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { BaseAlert } from './base_alert';

describe('BaseAlert', () => {
  describe('serialize', () => {
    it('should serialize with a raw alert provided', () => {
      const alert = new BaseAlert({} as any);
      expect(alert.serialize()).not.toBeNull();
    });
    it('should not serialize without a raw alert provided', () => {
      const alert = new BaseAlert();
      expect(alert.serialize()).toBeNull();
    });
  });

  describe('create', () => {
    it('should create an alert if it does not exist', async () => {
      const alert = new BaseAlert();
      const alertsClient = {
        create: jest.fn(),
        find: jest.fn().mockImplementation(() => {
          return {
            total: 0,
          };
        }),
      };
      const actionsClient = {
        get: jest.fn().mockImplementation(() => {
          return {
            actionTypeId: 'foo',
          };
        }),
      };
      const actions = [
        {
          id: '1abc',
          config: {},
        },
      ];

      await alert.createIfDoesNotExist(alertsClient as any, actionsClient as any, actions);
      expect(alertsClient.create).toHaveBeenCalledWith({
        data: {
          actions: [
            {
              group: 'default',
              id: '1abc',
              params: {
                message: '{{context.internalShortMessage}}',
              },
            },
          ],
          alertTypeId: undefined,
          consumer: 'monitoring',
          enabled: true,
          name: undefined,
          params: {},
          schedule: {
            interval: '1m',
          },
          tags: [],
          throttle: '1d',
        },
      });
    });

    it('should not create an alert if it exists', async () => {
      const alert = new BaseAlert();
      const alertsClient = {
        create: jest.fn(),
        find: jest.fn().mockImplementation(() => {
          return {
            total: 1,
            data: [],
          };
        }),
      };
      const actionsClient = {
        get: jest.fn().mockImplementation(() => {
          return {
            actionTypeId: 'foo',
          };
        }),
      };
      const actions = [
        {
          id: '1abc',
          config: {},
        },
      ];

      await alert.createIfDoesNotExist(alertsClient as any, actionsClient as any, actions);
      expect(alertsClient.create).not.toHaveBeenCalled();
    });
  });

  describe('getStates', () => {
    it('should get alert states', async () => {
      const alertsClient = {
        getAlertState: jest.fn().mockImplementation(() => {
          return {
            alertInstances: {
              abc123: {
                id: 'foobar',
              },
            },
          };
        }),
      };
      const id = '456def';
      const filters: any[] = [];
      const alert = new BaseAlert();
      const states = await alert.getStates(alertsClient as any, id, filters);
      expect(states).toStrictEqual({
        abc123: {
          id: 'foobar',
        },
      });
    });

    it('should return nothing if no states are available', async () => {
      const alertsClient = {
        getAlertState: jest.fn().mockImplementation(() => {
          return null;
        }),
      };
      const id = '456def';
      const filters: any[] = [];
      const alert = new BaseAlert();
      const states = await alert.getStates(alertsClient as any, id, filters);
      expect(states).toStrictEqual({});
    });
  });
});
