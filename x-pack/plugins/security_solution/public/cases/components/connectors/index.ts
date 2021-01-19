/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { CaseConnectorsRegistry } from './types';
import { createCaseConnectorsRegistry } from './connectors_registry';
import { getCaseConnector as getJiraCaseConnector } from './jira';
import { getCaseConnector as getResilientCaseConnector } from './resilient';
import { getCaseConnector as getServiceNowCaseConnector } from './servicenow';
import {
  JiraFieldsType,
  ServiceNowFieldsType,
  ResilientFieldsType,
} from '../../../../../case/common/api/connectors';

export { getActionType as getCaseConnectorUI } from './case';

export * from './config';
export * from './types';

interface GetCaseConnectorsReturn {
  caseConnectorsRegistry: CaseConnectorsRegistry;
}

class CaseConnectors {
  private caseConnectorsRegistry: CaseConnectorsRegistry;

  constructor() {
    this.caseConnectorsRegistry = createCaseConnectorsRegistry();
    this.init();
  }

  private init() {
    this.caseConnectorsRegistry.register<JiraFieldsType>(getJiraCaseConnector());
    this.caseConnectorsRegistry.register<ResilientFieldsType>(getResilientCaseConnector());
    this.caseConnectorsRegistry.register<ServiceNowFieldsType>(getServiceNowCaseConnector());
  }

  registry(): CaseConnectorsRegistry {
    return this.caseConnectorsRegistry;
  }
}

const caseConnectors = new CaseConnectors();

export const getCaseConnectors = (): GetCaseConnectorsReturn => {
  return {
    caseConnectorsRegistry: caseConnectors.registry(),
  };
};
