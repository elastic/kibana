/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { SNProductsConfig } from './types';

export const serviceNowITSMTable = 'incident';
export const serviceNowSIRTable = 'sn_si_incident';

export const ServiceNowITSMActionTypeId = '.servicenow';
export const ServiceNowSIRActionTypeId = '.servicenow-sir';
export const ServiceNowITOMActionTypeId = '.servicenow-itom';

export const snExternalServiceConfig: SNProductsConfig = {
  '.servicenow': {
    importSetTable: 'x_elas2_inc_int_elastic_incident',
    appScope: 'x_elas2_inc_int',
    table: 'incident',
    useImportAPI: true,
    commentFieldKey: 'work_notes',
  },
  '.servicenow-sir': {
    importSetTable: 'x_elas2_sir_int_elastic_si_incident',
    appScope: 'x_elas2_sir_int',
    table: 'sn_si_incident',
    useImportAPI: true,
    commentFieldKey: 'work_notes',
  },
  '.servicenow-itom': {
    importSetTable: 'x_elas2_inc_int_elastic_incident',
    appScope: 'x_elas2_inc_int',
    table: 'em_event',
    useImportAPI: false,
    commentFieldKey: 'work_notes',
  },
};

export const FIELD_PREFIX = 'u_';
export const DEFAULT_ALERTS_GROUPING_KEY = '{{rule.id}}:{{alert.id}}';
