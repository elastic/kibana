/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { lazy } from 'react';

import { CaseConnector } from '../types';
import {
  ConnectorTypes,
  ServiceNowITSMFieldsType,
  ServiceNowSIRFieldsType,
} from '../../../../common/api';
import * as i18n from './translations';

export const getServiceNowITSMCaseConnector = (): CaseConnector<ServiceNowITSMFieldsType> => ({
  id: ConnectorTypes.serviceNowITSM,
  fieldsComponent: lazy(() => import('./servicenow_itsm_case_fields')),
});

export const getServiceNowSIRCaseConnector = (): CaseConnector<ServiceNowSIRFieldsType> => ({
  id: ConnectorTypes.serviceNowSIR,
  fieldsComponent: lazy(() => import('./servicenow_sir_case_fields')),
});

export const serviceNowITSMFieldLabels = {
  impact: i18n.IMPACT,
  severity: i18n.SEVERITY,
  urgency: i18n.URGENCY,
};
