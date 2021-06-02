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
  CreateCasesConnectorFactory,
} from './types';

const getCasesConnectors = (): CasesConnectorsMap => {
  const casesConnectorsMap = new Map<CasesConnectorTypes, ICasesConnector>();
  casesConnectorsMap.set(ConnectorTypes.jira, getJiraCaseConnector());
  casesConnectorsMap.set(ConnectorTypes.serviceNowITSM, getServiceNowITSMCaseConnector());
  casesConnectorsMap.set(ConnectorTypes.serviceNowSIR, getServiceNowSIRCaseConnector());
  casesConnectorsMap.set(ConnectorTypes.resilient, getResilientCaseConnector());

  return casesConnectorsMap;
};

export const createCaseConnectorFactory: CreateCasesConnectorFactory = () => ({
  getCasesConnectors,
});
