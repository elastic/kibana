/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { lazy } from 'react';

import { CaseConnector } from '../types';
import { ConnectorTypes, SwimlaneFieldsType } from '../../../../common/api';
import * as i18n from './translations';

export const getCaseConnector = (): CaseConnector<SwimlaneFieldsType> => {
  return {
    id: ConnectorTypes.swimlane,
    fieldsComponent: lazy(() => import('./case_fields')),
  };
};

export const fieldLabels = {
  caseId: i18n.CASE_ID_LABEL,
  caseName: i18n.CASE_NAME_LABEL,
  severity: i18n.SEVERITY_LABEL,
};
