/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { CASE_SAVED_OBJECT } from '../../../common/constants';
import { SECURITY_SOLUTION_OWNER } from '../../../common';
import { CaseStatuses, CommentType, ConnectorTypes } from '../../../common/api';
import { createCaseSavedObjectResponse } from '../test_utils';
import { transformSavedObjectToExternalModel } from '../cases/transform';

export const casePayload = {
  title: 'Case SIR',
  tags: ['sir'],
  description: 'testing sir',
  connector: {
    id: '456',
    name: 'ServiceNow SN',
    type: ConnectorTypes.serviceNowSIR as const,
    fields: {
      category: 'Denial of Service',
      destIp: true,
      malwareHash: true,
      malwareUrl: true,
      priority: '2',
      sourceIp: true,
      subcategory: '45',
    },
  },
  settings: { syncAlerts: true },
  owner: SECURITY_SOLUTION_OWNER,
};

export const externalService = {
  pushed_at: '2021-02-03T17:41:26.108Z',
  pushed_by: { username: 'elastic', full_name: 'Elastic', email: 'elastic@elastic.co' },
  connector_id: '456',
  connector_name: 'ServiceNow SN',
  external_id: 'external-id',
  external_title: 'SIR0010037',
  external_url:
    'https://dev92273.service-now.com/nav_to.do?uri=sn_si_incident.do?sys_id=external-id',
};

export const originalCases = [
  { ...createCaseSavedObjectResponse(), id: '1' },
  { ...createCaseSavedObjectResponse(), id: '2' },
].map((so) => transformSavedObjectToExternalModel(so));

export const updatedCases = [
  {
    ...createCaseSavedObjectResponse(),
    id: '1',
    type: CASE_SAVED_OBJECT,
    attributes: {
      title: 'updated title',
      status: CaseStatuses.closed,
      connector: casePayload.connector,
    },
    references: [],
  },
  {
    ...createCaseSavedObjectResponse(),
    id: '2',
    type: CASE_SAVED_OBJECT,
    attributes: {
      description: 'updated desc',
      tags: ['one', 'two'],
      settings: { syncAlerts: false },
    },
    references: [],
  },
];

export const comment = {
  comment: 'a comment',
  type: CommentType.user as const,
  owner: SECURITY_SOLUTION_OWNER,
};

const alertComment = {
  alertId: 'alert-id-1',
  index: 'alert-index-1',
  rule: {
    id: 'rule-id-1',
    name: 'rule-name-1',
  },
  type: CommentType.alert as const,
  owner: SECURITY_SOLUTION_OWNER,
};

export const attachments = [
  { id: '1', attachment: { ...comment }, owner: SECURITY_SOLUTION_OWNER },
  { id: '2', attachment: { ...alertComment }, owner: SECURITY_SOLUTION_OWNER },
];
