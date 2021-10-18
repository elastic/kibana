/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  ENABLE_NEW_SN_ITSM_CONNECTOR,
  ENABLE_NEW_SN_SIR_CONNECTOR,
} from '../../constants/connectors';
import { SNProductsConfig } from './types';

export const serviceNowITSMTable = 'incident';
export const serviceNowSIRTable = 'sn_si_incident';

export const ServiceNowITSMActionTypeId = '.servicenow';
export const ServiceNowSIRActionTypeId = '.servicenow-sir';

export const snExternalServiceConfig: SNProductsConfig = {
  '.servicenow': {
    importSetTable: 'x_elas2_inc_int_elastic_incident',
    appScope: 'x_elas2_inc_int',
    table: 'incident',
    useImportAPI: ENABLE_NEW_SN_ITSM_CONNECTOR,
    commentFieldKey: 'work_notes',
  },
  '.servicenow-sir': {
    importSetTable: 'x_elas2_sir_int_elastic_si_incident',
    appScope: 'x_elas2_sir_int',
    table: 'sn_si_incident',
    useImportAPI: ENABLE_NEW_SN_SIR_CONNECTOR,
    commentFieldKey: 'work_notes',
  },
};

export const FIELD_PREFIX = 'u_';
