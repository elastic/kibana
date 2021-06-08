/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ConnectorTypes } from '../../common/api';
import { getCaseConnector as getJiraCaseConnector } from './jira';
import { getCaseConnector as getResilientCaseConnector } from './resilient';
import { getServiceNowITSMCaseConnector, getServiceNowSIRCaseConnector } from './servicenow';
import {
  CasesConnectorsMap,
  CasesConnectorTypes,
  ICasesConnector,
  ICasesConnectorFactory,
} from './types';

export class CasesConnectorsFactory implements ICasesConnectorFactory {
  private readonly casesConnectorsMap: Map<CasesConnectorTypes, ICasesConnector<{}>>;

  constructor() {
    this.casesConnectorsMap = new Map<CasesConnectorTypes, ICasesConnector>();
    this.initMapping();
  }

  private initMapping() {
    this.casesConnectorsMap.set(ConnectorTypes.jira, getJiraCaseConnector());
    this.casesConnectorsMap.set(ConnectorTypes.serviceNowITSM, getServiceNowITSMCaseConnector());
    this.casesConnectorsMap.set(ConnectorTypes.serviceNowSIR, getServiceNowSIRCaseConnector());
    this.casesConnectorsMap.set(ConnectorTypes.resilient, getResilientCaseConnector());
  }

  public getCasesConnectors = (): CasesConnectorsMap => {
    return this.casesConnectorsMap;
  };
}
