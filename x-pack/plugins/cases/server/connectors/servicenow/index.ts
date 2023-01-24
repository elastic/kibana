/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getMapping as getServiceNowITSMMapping } from './itsm_mapping';
import { format as formatServiceNowITSM } from './itsm_format';
import { getMapping as getServiceNowSIRMapping } from './sir_mapping';
import { format as formatServiceNowSIR } from './sir_format';

import type { ServiceNowITSMCasesConnector, ServiceNowSIRCasesConnector } from './types';

export const getServiceNowITSMCaseConnector = (): ServiceNowITSMCasesConnector => ({
  getMapping: getServiceNowITSMMapping,
  format: formatServiceNowITSM,
});

export const getServiceNowSIRCaseConnector = (): ServiceNowSIRCasesConnector => ({
  getMapping: getServiceNowSIRMapping,
  format: formatServiceNowSIR,
});
