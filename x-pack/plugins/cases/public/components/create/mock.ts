/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { CasePostRequest, ConnectorTypes } from '../../../common/api';
import { SECURITY_SOLUTION_OWNER } from '../../../common/constants';
import { choices } from '../connectors/mock';

export const sampleTags = ['coke', 'pepsi'];
export const sampleData: CasePostRequest = {
  description: 'what a great description',
  tags: sampleTags,
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
};

export const sampleConnectorData = { loading: false, connectors: [] };

export const useGetIncidentTypesResponse = {
  isLoading: false,
  incidentTypes: [
    {
      id: 19,
      name: 'Malware',
    },
    {
      id: 21,
      name: 'Denial of Service',
    },
  ],
};

export const useGetSeverityResponse = {
  isLoading: false,
  severity: [
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
};

export const useGetIssueTypesResponse = {
  isLoading: false,
  issueTypes: [
    {
      id: '10006',
      name: 'Task',
    },
    {
      id: '10007',
      name: 'Bug',
    },
  ],
};

export const useGetFieldsByIssueTypeResponse = {
  isLoading: false,
  fields: {
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
};

export const useGetChoicesResponse = {
  isLoading: false,
  choices,
};
