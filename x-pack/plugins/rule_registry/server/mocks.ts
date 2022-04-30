/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { alertsClientMock } from './alert_data_client/alerts_client.mock';
import { createRuleDataClientMock } from './rule_data_client/rule_data_client.mock';
import {
  ruleDataServiceMock,
  RuleDataServiceMock,
} from './rule_data_plugin_service/rule_data_plugin_service.mock';
import { createLifecycleAlertServicesMock } from './utils/lifecycle_alert_services_mock';

export const ruleRegistryMocks = {
  createLifecycleAlertServices: createLifecycleAlertServicesMock,
  createRuleDataService: ruleDataServiceMock.create,
  createRuleDataClient: createRuleDataClientMock,
  createAlertsClientMock: alertsClientMock,
};

export { RuleDataServiceMock };
