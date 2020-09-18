/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { loggingSystemMock } from 'src/core/server/mocks';
import { getResult } from '../routes/__mocks__/request_responses';
import { rulesNotificationAlertType } from './rules_notification_alert_type';
import { buildSignalsSearchQuery } from './build_signals_query';
import { alertsMock, AlertServicesMock } from '../../../../../alerts/server/mocks';
import { NotificationExecutorOptions } from './types';
jest.mock('./build_signals_query');

describe('rules_notification_alert_type', () => {
  let payload: NotificationExecutorOptions;
  let alert: ReturnType<typeof rulesNotificationAlertType>;
  let logger: ReturnType<typeof loggingSystemMock.createLogger>;
  let alertServices: AlertServicesMock;

  beforeEach(() => {
    alertServices = alertsMock.createAlertServices();
    logger = loggingSystemMock.createLogger();

    payload = {
      alertId: '1111',
      services: alertServices,
      params: { ruleAlertId: '2222' },
      state: {},
      spaceId: '',
      name: 'name',
      tags: [],
      startedAt: new Date('2019-12-14T16:40:33.400Z'),
      previousStartedAt: new Date('2019-12-13T16:40:33.400Z'),
      createdBy: 'elastic',
      updatedBy: 'elastic',
    };

    alert = rulesNotificationAlertType({
      logger,
    });
  });

  describe('executor', () => {
    it('throws an error if rule alert was not found', async () => {
      alertServices.savedObjectsClient.get.mockResolvedValue({
        id: 'id',
        attributes: {},
        type: 'type',
        references: [],
      });
      await alert.executor(payload);
      expect(logger.error).toHaveBeenCalledWith(
        `Saved object for alert ${payload.params.ruleAlertId} was not found`
      );
    });

    it('should call buildSignalsSearchQuery with proper params', async () => {
      const ruleAlert = getResult();
      alertServices.savedObjectsClient.get.mockResolvedValue({
        id: 'id',
        type: 'type',
        references: [],
        attributes: ruleAlert,
      });
      alertServices.callCluster.mockResolvedValue({
        count: 0,
      });

      await alert.executor(payload);

      expect(buildSignalsSearchQuery).toHaveBeenCalledWith(
        expect.objectContaining({
          from: '1576255233400',
          index: '.siem-signals',
          ruleId: 'rule-1',
          to: '1576341633400',
        })
      );
    });

    it('should resolve results_link when meta is undefined to use "/app/security"', async () => {
      const ruleAlert = getResult();
      delete ruleAlert.params.meta;
      alertServices.savedObjectsClient.get.mockResolvedValue({
        id: 'rule-id',
        type: 'type',
        references: [],
        attributes: ruleAlert,
      });
      alertServices.callCluster.mockResolvedValue({
        count: 10,
      });

      await alert.executor(payload);
      expect(alertServices.alertInstanceFactory).toHaveBeenCalled();

      const [{ value: alertInstanceMock }] = alertServices.alertInstanceFactory.mock.results;
      expect(alertInstanceMock.scheduleActions).toHaveBeenCalledWith(
        'default',
        expect.objectContaining({
          results_link:
            '/app/security/detections/rules/id/rule-id?timerange=(global:(linkTo:!(timeline),timerange:(from:1576255233400,kind:absolute,to:1576341633400)),timeline:(linkTo:!(global),timerange:(from:1576255233400,kind:absolute,to:1576341633400)))',
        })
      );
    });

    it('should resolve results_link when meta is an empty object to use "/app/security"', async () => {
      const ruleAlert = getResult();
      ruleAlert.params.meta = {};
      alertServices.savedObjectsClient.get.mockResolvedValue({
        id: 'rule-id',
        type: 'type',
        references: [],
        attributes: ruleAlert,
      });
      alertServices.callCluster.mockResolvedValue({
        count: 10,
      });
      await alert.executor(payload);
      expect(alertServices.alertInstanceFactory).toHaveBeenCalled();

      const [{ value: alertInstanceMock }] = alertServices.alertInstanceFactory.mock.results;
      expect(alertInstanceMock.scheduleActions).toHaveBeenCalledWith(
        'default',
        expect.objectContaining({
          results_link:
            '/app/security/detections/rules/id/rule-id?timerange=(global:(linkTo:!(timeline),timerange:(from:1576255233400,kind:absolute,to:1576341633400)),timeline:(linkTo:!(global),timerange:(from:1576255233400,kind:absolute,to:1576341633400)))',
        })
      );
    });

    it('should resolve results_link to custom kibana link when given one', async () => {
      const ruleAlert = getResult();
      ruleAlert.params.meta = {
        kibana_siem_app_url: 'http://localhost',
      };
      alertServices.savedObjectsClient.get.mockResolvedValue({
        id: 'rule-id',
        type: 'type',
        references: [],
        attributes: ruleAlert,
      });
      alertServices.callCluster.mockResolvedValue({
        count: 10,
      });
      await alert.executor(payload);
      expect(alertServices.alertInstanceFactory).toHaveBeenCalled();

      const [{ value: alertInstanceMock }] = alertServices.alertInstanceFactory.mock.results;
      expect(alertInstanceMock.scheduleActions).toHaveBeenCalledWith(
        'default',
        expect.objectContaining({
          results_link:
            'http://localhost/detections/rules/id/rule-id?timerange=(global:(linkTo:!(timeline),timerange:(from:1576255233400,kind:absolute,to:1576341633400)),timeline:(linkTo:!(global),timerange:(from:1576255233400,kind:absolute,to:1576341633400)))',
        })
      );
    });

    it('should not call alertInstanceFactory if signalsCount was 0', async () => {
      const ruleAlert = getResult();
      alertServices.savedObjectsClient.get.mockResolvedValue({
        id: 'id',
        type: 'type',
        references: [],
        attributes: ruleAlert,
      });
      alertServices.callCluster.mockResolvedValue({
        count: 0,
      });

      await alert.executor(payload);

      expect(alertServices.alertInstanceFactory).not.toHaveBeenCalled();
    });

    it('should call scheduleActions if signalsCount was greater than 0', async () => {
      const ruleAlert = getResult();
      alertServices.savedObjectsClient.get.mockResolvedValue({
        id: 'id',
        type: 'type',
        references: [],
        attributes: ruleAlert,
      });
      alertServices.callCluster.mockResolvedValue({
        count: 10,
      });

      await alert.executor(payload);

      expect(alertServices.alertInstanceFactory).toHaveBeenCalled();

      const [{ value: alertInstanceMock }] = alertServices.alertInstanceFactory.mock.results;
      expect(alertInstanceMock.replaceState).toHaveBeenCalledWith(
        expect.objectContaining({ signals_count: 10 })
      );
      expect(alertInstanceMock.scheduleActions).toHaveBeenCalledWith(
        'default',
        expect.objectContaining({
          rule: expect.objectContaining({
            name: ruleAlert.name,
          }),
        })
      );
    });
  });
});
