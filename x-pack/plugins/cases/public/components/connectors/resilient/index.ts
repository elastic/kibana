/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { lazy } from 'react';

import { CaseConnector } from '../types';
import { ResilientFieldsType } from '../../../../common';
import * as i18n from './translations';

export * from './types';

export const getCaseConnector = (): CaseConnector<ResilientFieldsType> => {
  return {
    id: '.resilient',
    fieldsComponent: lazy(() => import('./case_fields')),
  };
};

export const fieldLabels = {
  incidentTypes: i18n.INCIDENT_TYPES_LABEL,
  severityCode: i18n.SEVERITY_LABEL,
};
