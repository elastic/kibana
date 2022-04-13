/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { loggingSystemMock } from 'src/core/server/mocks';
import { getAlertMock } from '../routes/__mocks__/request_responses';
// eslint-disable-next-line no-restricted-imports
import { legacyRulesNotificationAlertType } from './legacy_rules_notification_alert_type';
import { buildSignalsSearchQuery } from './build_signals_query';
import { alertsMock, RuleExecutorServicesMock } from '../../../../../alerting/server/mocks';
// eslint-disable-next-line no-restricted-imports
import { LegacyNotificationExecutorOptions } from './legacy_types';
import {
  sampleDocSearchResultsNoSortIdNoVersion,
  sampleDocSearchResultsWithSortId,
  sampleEmptyDocSearchResults,
} from '../signals/__mocks__/es_results';
import { DEFAULT_RULE_NOTIFICATION_QUERY_SIZE } from '../../../../common/constants';
import { getQueryRuleParams } from '../schemas/rule_schemas.mock';

jest.mock('./build_signals_query');

/**
 * @deprecated Once we are confident all rules relying on side-car actions SO's have been migrated to SO references we should remove this function
 */
describe('legacyRules_notification_alert_type', () => {
  let payload: LegacyNotificationExecutorOptions;
  let alert: ReturnType<typeof legacyRulesNotificationAlertType>;
  let logger: ReturnType<typeof loggingSystemMock.createLogger>;
  let alertServices: RuleExecutorServicesMock;

  beforeEach(() => {
    alertServices = alertsMock.createRuleExecutorServices();
    logger = loggingSystemMock.createLogger();

    payload = {
      alertId: '1111',
      executionId: 'b33f65d7-b33f-4aae-8d20-c93613dec9f9',
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
      rule: {
        name: 'name',
        tags: [],
        consumer: 'foo',
        producer: 'foo',
        ruleTypeId: 'ruleType',
        ruleTypeName: 'Name of rule',
        enabled: true,
        schedule: {
          interval: '1h',
        },
        actions: [],
        createdBy: 'elastic',
        updatedBy: 'elastic',
        createdAt: new Date('2019-12-14T16:40:33.400Z'),
        updatedAt: new Date('2019-12-14T16:40:33.400Z'),
        throttle: null,
        notifyWhen: null,
      },
    };

    alert = legacyRulesNotificationAlertType({
      logger,
    });
  });

  describe.each([
    ['Legacy', false],
    ['RAC', true],
  ])('executor - %s', (_, isRuleRegistryEnabled) => {
    it('throws an error if rule alert was not found', async () => {
      alertServices.savedObjectsClient.get.mockResolvedValue({
        id: 'id',
        attributes: {},
        type: 'type',
        references: [],
      });
      await alert.executor(payload);
      expect(logger.error).toHaveBeenCalledWith(
        `Security Solution notification (Legacy) saved object for alert ${payload.params.ruleAlertId} was not found with id: \"1111\". space id: \"\" This indicates a dangling (Legacy) notification alert. You should delete this rule through \"Kibana UI -> Stack Management -> Rules and Connectors\" to remove this error message.`
      );
    });

    it('should call buildSignalsSearchQuery with proper params', async () => {
      const ruleAlert = getAlertMock(isRuleRegistryEnabled, getQueryRuleParams());
      alertServices.savedObjectsClient.get.mockResolvedValue({
        id: 'id',
        type: 'type',
        references: [],
        attributes: ruleAlert,
      });
      alertServices.scopedClusterClient.asCurrentUser.search.mockResponse(
        sampleDocSearchResultsWithSortId()
      );

      await alert.executor(payload);

      expect(buildSignalsSearchQuery).toHaveBeenCalledWith(
        expect.objectContaining({
          from: '1576255233400',
          index: '.siem-signals',
          ruleId: 'rule-1',
          to: '1576341633400',
          size: DEFAULT_RULE_NOTIFICATION_QUERY_SIZE,
        })
      );
    });

    it('should resolve results_link when meta is undefined to use "/app/security"', async () => {
      const ruleAlert = getAlertMock(isRuleRegistryEnabled, getQueryRuleParams());
      delete ruleAlert.params.meta;
      alertServices.savedObjectsClient.get.mockResolvedValue({
        id: 'rule-id',
        type: 'type',
        references: [],
        attributes: ruleAlert,
      });
      alertServices.scopedClusterClient.asCurrentUser.search.mockResponse(
        sampleDocSearchResultsWithSortId()
      );

      await alert.executor(payload);
      expect(alertServices.alertFactory.create).toHaveBeenCalled();

      const [{ value: alertInstanceMock }] = alertServices.alertFactory.create.mock.results;
      expect(alertInstanceMock.scheduleActions).toHaveBeenCalledWith(
        'default',
        expect.objectContaining({
          results_link:
            '/app/security/detections/rules/id/rule-id?timerange=(global:(linkTo:!(timeline),timerange:(from:1576255233400,kind:absolute,to:1576341633400)),timeline:(linkTo:!(global),timerange:(from:1576255233400,kind:absolute,to:1576341633400)))',
        })
      );
    });

    it('should resolve results_link when meta is an empty object to use "/app/security"', async () => {
      const ruleAlert = getAlertMock(isRuleRegistryEnabled, getQueryRuleParams());
      ruleAlert.params.meta = {};
      alertServices.savedObjectsClient.get.mockResolvedValue({
        id: 'rule-id',
        type: 'type',
        references: [],
        attributes: ruleAlert,
      });
      alertServices.scopedClusterClient.asCurrentUser.search.mockResponse(
        sampleDocSearchResultsWithSortId()
      );
      await alert.executor(payload);
      expect(alertServices.alertFactory.create).toHaveBeenCalled();

      const [{ value: alertInstanceMock }] = alertServices.alertFactory.create.mock.results;
      expect(alertInstanceMock.scheduleActions).toHaveBeenCalledWith(
        'default',
        expect.objectContaining({
          results_link:
            '/app/security/detections/rules/id/rule-id?timerange=(global:(linkTo:!(timeline),timerange:(from:1576255233400,kind:absolute,to:1576341633400)),timeline:(linkTo:!(global),timerange:(from:1576255233400,kind:absolute,to:1576341633400)))',
        })
      );
    });

    it('should resolve results_link to custom kibana link when given one', async () => {
      const ruleAlert = getAlertMock(isRuleRegistryEnabled, getQueryRuleParams());
      ruleAlert.params.meta = {
        kibana_siem_app_url: 'http://localhost',
      };
      alertServices.savedObjectsClient.get.mockResolvedValue({
        id: 'rule-id',
        type: 'type',
        references: [],
        attributes: ruleAlert,
      });
      alertServices.scopedClusterClient.asCurrentUser.search.mockResponse(
        sampleDocSearchResultsWithSortId()
      );
      await alert.executor(payload);
      expect(alertServices.alertFactory.create).toHaveBeenCalled();

      const [{ value: alertInstanceMock }] = alertServices.alertFactory.create.mock.results;
      expect(alertInstanceMock.scheduleActions).toHaveBeenCalledWith(
        'default',
        expect.objectContaining({
          results_link:
            'http://localhost/detections/rules/id/rule-id?timerange=(global:(linkTo:!(timeline),timerange:(from:1576255233400,kind:absolute,to:1576341633400)),timeline:(linkTo:!(global),timerange:(from:1576255233400,kind:absolute,to:1576341633400)))',
        })
      );
    });

    it('should not call alertFactory.create if signalsCount was 0', async () => {
      const ruleAlert = getAlertMock(isRuleRegistryEnabled, getQueryRuleParams());
      alertServices.savedObjectsClient.get.mockResolvedValue({
        id: 'id',
        type: 'type',
        references: [],
        attributes: ruleAlert,
      });
      alertServices.scopedClusterClient.asCurrentUser.search.mockResponse(
        sampleEmptyDocSearchResults()
      );

      await alert.executor(payload);

      expect(alertServices.alertFactory.create).not.toHaveBeenCalled();
    });

    it('should call scheduleActions if signalsCount was greater than 0', async () => {
      const ruleAlert = getAlertMock(isRuleRegistryEnabled, getQueryRuleParams());
      alertServices.savedObjectsClient.get.mockResolvedValue({
        id: 'id',
        type: 'type',
        references: [],
        attributes: ruleAlert,
      });
      alertServices.scopedClusterClient.asCurrentUser.search.mockResponse(
        sampleDocSearchResultsNoSortIdNoVersion()
      );

      await alert.executor(payload);

      expect(alertServices.alertFactory.create).toHaveBeenCalled();

      const [{ value: alertInstanceMock }] = alertServices.alertFactory.create.mock.results;
      expect(alertInstanceMock.replaceState).toHaveBeenCalledWith(
        expect.objectContaining({ signals_count: 100 })
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
