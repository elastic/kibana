/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { CaseSeverity, ConnectorTypes } from '../../../common/types/domain';
import type { CasePostRequest } from '../../../common/types/api';
import { SECURITY_SOLUTION_OWNER } from '../../../common/constants';
import { choices } from '../connectors/mock';

export const sampleTags = ['coke', 'pepsi'];

export const sampleData: CasePostRequest = {
  description: 'what a great description',
  tags: sampleTags,
  severity: CaseSeverity.LOW,
  title: 'what a cool title',
  connector: {
    fields: null,
    id: 'none',
    name: 'none',
    type: ConnectorTypes.none,
  },
  settings: {
    syncAlerts: true,
  },
  owner: SECURITY_SOLUTION_OWNER,
  assignees: [],
  customFields: [],
  category: null,
};

export const sampleConnectorData = { isLoading: false, data: [] };

export const useGetIncidentTypesResponse = {
  isLoading: false,
  data: {
    data: [
      {
        id: 19,
        name: 'Malware',
      },
      {
        id: 21,
        name: 'Denial of Service',
      },
    ],
  },
};

export const useGetSeverityResponse = {
  isLoading: false,
  data: {
    data: [
      {
        id: 4,
        name: 'Low',
      },
      {
        id: 5,
        name: 'Medium',
      },
      {
        id: 6,
        name: 'High',
      },
    ],
  },
};

export const useGetIssueTypesResponse = {
  isLoading: false,
  data: {
    data: [
      {
        id: '10006',
        name: 'Task',
      },
      {
        id: '10007',
        name: 'Bug',
      },
    ],
  },
};

export const useGetFieldsByIssueTypeResponse = {
  isLoading: false,
  data: {
    data: {
      summary: { allowedValues: [], defaultValue: {} },
      labels: { allowedValues: [], defaultValue: {} },
      description: { allowedValues: [], defaultValue: {} },
      priority: {
        allowedValues: [
          {
            name: 'Medium',
            id: '3',
          },
          {
            name: 'Low',
            id: '2',
          },
        ],
        defaultValue: { name: 'Medium', id: '3' },
      },
    },
  },
};

export const useGetChoicesResponse = {
  isLoading: false,
  data: { data: choices },
};
