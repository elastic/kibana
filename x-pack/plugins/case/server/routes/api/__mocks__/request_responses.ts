/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { CasePostRequest, CasesConfigureRequest } from '../../../../common/api';
// eslint-disable-next-line @kbn/eslint/no-restricted-paths
import { FindActionResult } from '../../../../../actions/server/types';

export const newCase: CasePostRequest = {
  title: 'My new case',
  description: 'A description',
  tags: ['new', 'case'],
};

export const getActions = (): FindActionResult[] => [
  {
    id: 'e90075a5-c386-41e3-ae21-ba4e61510695',
    actionTypeId: '.webhook',
    name: 'Test',
    config: {
      method: 'post',
      url: 'https://example.com',
      headers: null,
    },
    isPreconfigured: false,
    referencedByCount: 0,
  },
  {
    id: '123',
    actionTypeId: '.servicenow',
    name: 'ServiceNow',
    config: {
      incidentConfiguration: {
        mapping: [
          {
            source: 'title',
            target: 'short_description',
            actionType: 'overwrite',
          },
          {
            source: 'description',
            target: 'description',
            actionType: 'overwrite',
          },
          {
            source: 'comments',
            target: 'comments',
            actionType: 'append',
          },
        ],
      },
      apiUrl: 'https://dev102283.service-now.com',
      isCaseOwned: true,
    },
    isPreconfigured: false,
    referencedByCount: 0,
  },
];

export const newConfiguration: CasesConfigureRequest = {
  connector_id: '456',
  connector_name: 'My connector 2',
  closure_type: 'close-by-pushing',
};
