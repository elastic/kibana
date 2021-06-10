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
import { ICasesConnector, CasesConnectorsMap } from './types';

const mapping: Record<ConnectorTypes, ICasesConnector | null> = {
  [ConnectorTypes.jira]: getJiraCaseConnector(),
  [ConnectorTypes.serviceNowITSM]: getServiceNowITSMCaseConnector(),
  [ConnectorTypes.serviceNowSIR]: getServiceNowSIRCaseConnector(),
  [ConnectorTypes.resilient]: getResilientCaseConnector(),
  [ConnectorTypes.none]: null,
};

const isConnectorTypeSupported = (type: string): type is ConnectorTypes =>
  Object.values(ConnectorTypes).includes(type as ConnectorTypes);

export const casesConnectors: CasesConnectorsMap = {
  get: (type: string): ICasesConnector | undefined | null =>
    isConnectorTypeSupported(type) ? mapping[type] : undefined,
};
