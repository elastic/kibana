/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { lazy } from 'react';

import { CaseSetting } from '../types';
import { ResilientFieldsType } from '../../../../../../case/common/api/connectors';
import * as i18n from './translations';

export * from './types';

export const getCaseSetting = (): CaseSetting<ResilientFieldsType> => {
  return {
    id: '.resilient',
    caseSettingFieldsComponent: lazy(() => import('./fields')),
  };
};

export const fieldLabels = {
  incidentTypes: i18n.INCIDENT_TYPES_LABEL,
  severityCode: i18n.SEVERITY_LABEL,
};
