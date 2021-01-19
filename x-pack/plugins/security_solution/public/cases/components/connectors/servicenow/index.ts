/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { lazy } from 'react';

import { CaseConnector } from '../types';
import { ServiceNowFieldsType } from '../../../../../../case/common/api/connectors';
import * as i18n from './translations';

export const getCaseConnector = (): CaseConnector<ServiceNowFieldsType> => {
  return {
    id: '.servicenow',
    fieldsComponent: lazy(() => import('./case_fields')),
  };
};

export const fieldLabels = {
  impact: i18n.IMPACT,
  severity: i18n.SEVERITY,
  urgency: i18n.URGENCY,
};
