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
import { CaseConnectors, CreateCasesConnectorFactory } from './types';

const getCaseConnectors = (): CaseConnectors => ({
  [ConnectorTypes.jira]: getJiraCaseConnector(),
  [ConnectorTypes.serviceNowITSM]: getServiceNowITSMCaseConnector(),
  [ConnectorTypes.serviceNowSIR]: getServiceNowSIRCaseConnector(),
  [ConnectorTypes.resilient]: getResilientCaseConnector(),
});

export const createCaseConnectorFactory: CreateCasesConnectorFactory = () => ({
  getCaseConnectors,
});
