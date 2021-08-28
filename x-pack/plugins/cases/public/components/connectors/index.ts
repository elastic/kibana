/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { JiraFieldsType } from '../../../common/api/connectors/jira';
import type { ResilientFieldsType } from '../../../common/api/connectors/resilient';
import type { ServiceNowITSMFieldsType } from '../../../common/api/connectors/servicenow_itsm';
import type { ServiceNowSIRFieldsType } from '../../../common/api/connectors/servicenow_sir';
import type { SwimlaneFieldsType } from '../../../common/api/connectors/swimlane';
import { createCaseConnectorsRegistry } from './connectors_registry';
import { getCaseConnector as getJiraCaseConnector } from './jira';
import { getCaseConnector as getResilientCaseConnector } from './resilient';
import { getServiceNowITSMCaseConnector, getServiceNowSIRCaseConnector } from './servicenow';
import { getCaseConnector as getSwimlaneCaseConnector } from './swimlane';
import type { CaseConnectorsRegistry } from './types';

export { getActionType as getCaseConnectorUi } from './case';
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
    this.caseConnectorsRegistry.register<ServiceNowITSMFieldsType>(
      getServiceNowITSMCaseConnector()
    );
    this.caseConnectorsRegistry.register<ServiceNowSIRFieldsType>(getServiceNowSIRCaseConnector());
    this.caseConnectorsRegistry.register<SwimlaneFieldsType>(getSwimlaneCaseConnector());
  }

  registry(): CaseConnectorsRegistry {
    return this.caseConnectorsRegistry;
  }
}

const caseConnectors = new CaseConnectors();

export const getCaseConnectors = (): GetCaseConnectorsReturn => ({
  caseConnectorsRegistry: caseConnectors.registry(),
});
