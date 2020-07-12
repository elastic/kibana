/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { AlertsFactory } from './alerts_factory';
import { ALERT_CPU_USAGE } from '../../common/constants';

describe('AlertsFactory', () => {
  const alertsClient = {
    find: jest.fn(),
  };

  afterEach(() => {
    alertsClient.find.mockReset();
  });

  it('should get by type', async () => {
    const id = '1abc';
    alertsClient.find = jest.fn().mockImplementation(() => {
      return {
        total: 1,
        data: [
          {
            id,
          },
        ],
      };
    });
    const alert = await AlertsFactory.getByType(ALERT_CPU_USAGE, alertsClient as any);
    expect(alert).not.toBeNull();
    expect(alert?.type).toBe(ALERT_CPU_USAGE);
  });

  it('should handle no alert found', async () => {
    alertsClient.find = jest.fn().mockImplementation(() => {
      return {
        total: 0,
      };
    });
    const alert = await AlertsFactory.getByType(ALERT_CPU_USAGE, alertsClient as any);
    expect(alert).not.toBeNull();
    expect(alert?.type).toBe(ALERT_CPU_USAGE);
  });

  it('should pass in the correct filters', async () => {
    let filter = null;
    alertsClient.find = jest.fn().mockImplementation(({ options }) => {
      filter = options.filter;
      return {
        total: 0,
      };
    });
    await AlertsFactory.getByType(ALERT_CPU_USAGE, alertsClient as any);
    expect(filter).toBe(`alert.attributes.alertTypeId:${ALERT_CPU_USAGE}`);
  });

  it('should handle no alerts client', async () => {
    const alert = await AlertsFactory.getByType(ALERT_CPU_USAGE, undefined);
    expect(alert).not.toBeNull();
    expect(alert?.type).toBe(ALERT_CPU_USAGE);
  });

  it('should get all', () => {
    const alerts = AlertsFactory.getAll();
    expect(alerts.length).toBe(7);
  });
});
