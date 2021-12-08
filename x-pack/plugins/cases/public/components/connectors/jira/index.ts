/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { lazy } from 'react';

import { CaseConnector } from '../types';
import { ConnectorTypes, JiraFieldsType } from '../../../../common/api';
import * as i18n from './translations';

export * from './types';

export const getCaseConnector = (): CaseConnector<JiraFieldsType> => ({
  id: ConnectorTypes.jira,
  fieldsComponent: lazy(() => import('./case_fields')),
});
export const fieldLabels = {
  issueType: i18n.ISSUE_TYPE,
  priority: i18n.PRIORITY,
  parent: i18n.PARENT_ISSUE,
};
