/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { flatten } from 'lodash';
import { CompleteTimeline, getTimeline } from './timeline';

export interface TestCase extends TestCaseWithoutTimeline {
  timeline: CompleteTimeline;
}

export interface TestCaseWithoutTimeline {
  name: string;
  tags: string[];
  description: string;
  reporter: string;
  owner: string;
}

export interface Connector {
  connectorName: string;
  URL: string;
  username: string;
  password: string;
}

export interface JiraConnectorOptions {
  issueType: string;
  priority: string;
}

export interface ServiceNowconnectorOptions {
  urgency: string;
  severity: string;
  impact: string;
}

export interface IbmResilientConnectorOptions {
  title: string;
  severity: string;
  incidentTypes: string[];
}

interface ServiceNowHealthResponse {
  result: {
    name: string;
    scope: string;
    version: string;
  };
}

export const getCase1 = (): TestCase => ({
  name: 'This is the title of the case',
  tags: ['Tag1', 'Tag2'],
  description: 'This is the case description',
  timeline: getTimeline(),
  reporter: 'elastic',
  owner: 'securitySolution',
});

export const getServiceNowConnector = (): Connector => ({
  connectorName: 'New connector',
  URL: 'https://www.test.service-now.com',
  username: 'Username Name',
  password: 'password',
});

export const getServiceNowITSMHealthResponse = (): ServiceNowHealthResponse => ({
  result: {
    name: 'Elastic',
    scope: 'x_elas2_inc_int',
    version: '1.0.0',
  },
});

export const getJiraConnectorOptions = (): JiraConnectorOptions => ({
  issueType: '10006',
  priority: 'High',
});

export const getServiceNowConnectorOptions = (): ServiceNowconnectorOptions => ({
  urgency: '2',
  severity: '1',
  impact: '3',
});

export const getIbmResilientConnectorOptions = (): IbmResilientConnectorOptions => ({
  title: 'Resilient',
  severity: 'Medium',
  incidentTypes: ['Communication error (fax; email)', 'Denial of Service'],
});

export const TIMELINE_CASE_ID = '68248e00-f689-11ea-9ab2-59238b522856';

export const getConnectorIds = () => ({
  jira: '000e5f86-08b0-4882-adfd-6df981d45c1b',
  sn: '93a69ba3-3c31-4b4c-bf86-cc79a090f437',
  resilient: 'a6a8dd7f-7e88-48fe-9b9f-70b668da8cbc',
});

export const getMockConnectorsResponse = () => [
  {
    id: getConnectorIds().jira,
    actionTypeId: '.jira',
    name: 'Jira',
    config: {
      apiUrl: 'https://siem-kibana.atlassian.net',
      projectKey: 'RJ',
    },
    isPreconfigured: false,
    referencedByCount: 0,
  },
  {
    id: getConnectorIds().resilient,
    actionTypeId: '.resilient',
    name: 'Resilient',
    config: {
      apiUrl: 'https://ibm-resilient.siem.estc.dev',
      orgId: '201',
    },
    isPreconfigured: false,
    referencedByCount: 0,
  },
  {
    id: getConnectorIds().sn,
    actionTypeId: '.servicenow',
    name: 'ServiceNow',
    config: {
      apiUrl: 'https://dev65287.service-now.com',
    },
    isPreconfigured: false,
    referencedByCount: 0,
  },
];

export const getExecuteResponses = () => ({
  servicenow: {
    choices: {
      status: 'ok',
      data: [
        {
          dependent_value: '',
          label: 'Priviledge Escalation',
          value: 'Priviledge Escalation',
          element: 'category',
        },
        {
          dependent_value: '',
          label: 'Criminal activity/investigation',
          value: 'Criminal activity/investigation',
          element: 'category',
        },
        {
          dependent_value: '',
          label: 'Denial of Service',
          value: 'Denial of Service',
          element: 'category',
        },
        {
          dependent_value: 'Denial of Service',
          label: 'Inbound or outbound',
          value: '12',
          element: 'subcategory',
        },
        {
          dependent_value: 'Denial of Service',
          label: 'Single or distributed (DoS or DDoS)',
          value: '26',
          element: 'subcategory',
        },
        {
          dependent_value: 'Denial of Service',
          label: 'Inbound DDos',
          value: 'inbound_ddos',
          element: 'subcategory',
        },
        {
          dependent_value: '',
          label: 'Software',
          value: 'software',
          element: 'category',
        },
        {
          dependent_value: 'software',
          label: 'Operation System',
          value: 'os',
          element: 'subcategory',
        },
        ...flatten(
          ['severity', 'urgency', 'impact', 'priority'].map((element) => [
            {
              dependent_value: '',
              label: '1 - Critical',
              value: '1',
              element,
            },
            {
              dependent_value: '',
              label: '2 - High',
              value: '2',
              element,
            },
            {
              dependent_value: '',
              label: '3 - Moderate',
              value: '3',
              element,
            },
            {
              dependent_value: '',
              label: '4 - Low',
              value: '4',
              element,
            },
          ])
        ),
      ],
    },
  },
  jira: {
    issueTypes: {
      status: 'ok',
      data: [
        { id: '10006', name: 'Task' },
        { id: '10007', name: 'Sub-task' },
      ],
      actionId: getConnectorIds().jira,
    },
    fieldsByIssueType: {
      status: 'ok',
      data: {
        summary: { allowedValues: [], defaultValue: {} },
        issuetype: {
          allowedValues: [
            {
              self: 'https://siem-kibana.atlassian.net/rest/api/2/issuetype/10006',
              id: '10006',
              description: 'A small, distinct piece of work.',
              iconUrl:
                'https://siem-kibana.atlassian.net/secure/viewavatar?size=medium&avatarId=10318&avatarType=issuetype',
              name: 'Task',
              subtask: false,
              avatarId: 10318,
            },
          ],
          defaultValue: {},
        },
        attachment: { allowedValues: [], defaultValue: {} },
        duedate: { allowedValues: [], defaultValue: {} },
        description: { allowedValues: [], defaultValue: {} },
        project: {
          allowedValues: [
            {
              self: 'https://siem-kibana.atlassian.net/rest/api/2/project/10011',
              id: '10011',
              key: 'RJ',
              name: 'Refactor Jira',
              projectTypeKey: 'business',
              simplified: false,
              avatarUrls: {
                '48x48':
                  'https://siem-kibana.atlassian.net/secure/projectavatar?pid=10011&avatarId=10423',
                '24x24':
                  'https://siem-kibana.atlassian.net/secure/projectavatar?size=small&s=small&pid=10011&avatarId=10423',
                '16x16':
                  'https://siem-kibana.atlassian.net/secure/projectavatar?size=xsmall&s=xsmall&pid=10011&avatarId=10423',
                '32x32':
                  'https://siem-kibana.atlassian.net/secure/projectavatar?size=medium&s=medium&pid=10011&avatarId=10423',
              },
            },
          ],
          defaultValue: {},
        },
        assignee: { allowedValues: [], defaultValue: {} },
        priority: {
          allowedValues: [
            {
              self: 'https://siem-kibana.atlassian.net/rest/api/2/priority/1',
              iconUrl: 'https://siem-kibana.atlassian.net/images/icons/priorities/highest.svg',
              name: 'Highest',
              id: '1',
            },
            {
              self: 'https://siem-kibana.atlassian.net/rest/api/2/priority/2',
              iconUrl: 'https://siem-kibana.atlassian.net/images/icons/priorities/high.svg',
              name: 'High',
              id: '2',
            },
            {
              self: 'https://siem-kibana.atlassian.net/rest/api/2/priority/3',
              iconUrl: 'https://siem-kibana.atlassian.net/images/icons/priorities/medium.svg',
              name: 'Medium',
              id: '3',
            },
            {
              self: 'https://siem-kibana.atlassian.net/rest/api/2/priority/4',
              iconUrl: 'https://siem-kibana.atlassian.net/images/icons/priorities/low.svg',
              name: 'Low',
              id: '4',
            },
            {
              self: 'https://siem-kibana.atlassian.net/rest/api/2/priority/5',
              iconUrl: 'https://siem-kibana.atlassian.net/images/icons/priorities/lowest.svg',
              name: 'Lowest',
              id: '5',
            },
          ],
          defaultValue: {
            self: 'https://siem-kibana.atlassian.net/rest/api/2/priority/3',
            iconUrl: 'https://siem-kibana.atlassian.net/images/icons/priorities/medium.svg',
            name: 'Medium',
            id: '3',
          },
        },
        timetracking: { allowedValues: [], defaultValue: {} },
        labels: { allowedValues: [], defaultValue: {} },
      },
      actionId: getConnectorIds().jira,
    },
  },
  resilient: {
    incidentTypes: {
      status: 'ok',
      data: [
        { id: 17, name: 'Communication error (fax; email)' },
        { id: 21, name: 'Denial of Service' },
      ],
      actionId: getConnectorIds().resilient,
    },
    severity: {
      status: 'ok',
      data: [
        { id: 4, name: 'Low' },
        { id: 5, name: 'Medium' },
        { id: 6, name: 'High' },
      ],
      actionId: getConnectorIds().resilient,
    },
  },
});
