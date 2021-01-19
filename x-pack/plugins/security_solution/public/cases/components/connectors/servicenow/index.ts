/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { lazy } from 'react';

import { CaseConnector } from '../types';
import {
  ServiceNowIMFieldsType,
  ServiceNowSIRFieldsType,
} from '../../../../../../case/common/api/connectors';
import * as i18n from './translations';

export const getServiceNowIMCaseConnector = (): CaseConnector<ServiceNowIMFieldsType> => {
  return {
    id: '.servicenow',
    fieldsComponent: lazy(() => import('./servicenow_case_fields')),
  };
};

export const getServiceNowSIRCaseConnector = (): CaseConnector<ServiceNowSIRFieldsType> => {
  return {
    id: '.servicenow-sir',
    fieldsComponent: lazy(() => import('./servicenow_sir_case_fields')),
  };
};

export const serviceNowIMFieldLabels = {
  impact: i18n.IMPACT,
  severity: i18n.SEVERITY,
  urgency: i18n.URGENCY,
};
