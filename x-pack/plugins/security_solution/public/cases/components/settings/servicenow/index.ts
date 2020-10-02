/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { lazy } from 'react';

import { CaseSetting } from '../types';
import { ServiceNowFieldsType } from '../../../../../../case/common/api/connectors';
import * as i18n from './translations';

export const getCaseSetting = (): CaseSetting<ServiceNowFieldsType> => {
  return {
    id: '.servicenow',
    caseSettingFieldsComponent: lazy(() => import('./fields')),
  };
};

export const fieldLabels = {
  impact: i18n.IMPACT,
  severity: i18n.SEVERITY,
  urgency: i18n.URGENCY,
};
