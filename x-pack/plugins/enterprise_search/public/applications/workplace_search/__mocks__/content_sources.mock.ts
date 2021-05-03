/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { groups } from './groups.mock';

import { staticSourceData } from '../views/content_sources/source_data';
import { mergeServerAndStaticData } from '../views/content_sources/sources_logic';

export const contentSources = [
  {
    id: '123',
    serviceType: 'custom',
    searchable: true,
    supportedByLicense: true,
    status: 'foo',
    statusMessage: 'bar',
    name: 'source',
    documentCount: '123',
    isFederatedSource: false,
    errorReason: null,
    allowsReauth: true,
    boost: 1,
  },
  {
    id: '124',
    serviceType: 'jira',
    searchable: true,
    supportedByLicense: true,
    status: 'synced',
    statusMessage: 'all green',
    name: 'Jira',
    documentCount: '34234',
    isFederatedSource: false,
    errorReason: null,
    allowsReauth: true,
    boost: 0.5,
  },
];

export const fullContentSources = [
  {
    ...contentSources[0],
    activities: [
      {
        details: ['detail'],
        event: 'this is an event',
        time: '2021-01-20',
        status: 'syncing',
      },
    ],
    details: [
      {
        title: 'My Thing',
        description: 'This is a thing.',
      },
    ],
    summary: [
      {
        count: 1,
        type: 'summary',
      },
    ],
    groups,
    custom: false,
    accessToken: '123token',
    urlField: 'myLink',
    titleField: 'heading',
    licenseSupportsPermissions: true,
    serviceTypeSupportsPermissions: true,
    indexPermissions: true,
    hasPermissions: true,
    urlFieldIsLinkable: true,
    createdAt: '2021-01-20',
    serviceName: 'myService',
  },
  {
    ...contentSources[1],
    activities: [],
    details: [],
    summary: [],
    groups: [],
    custom: true,
    accessToken: '123token',
    urlField: 'url',
    titleField: 'title',
    licenseSupportsPermissions: false,
    serviceTypeSupportsPermissions: false,
    indexPermissions: false,
    hasPermissions: false,
    urlFieldIsLinkable: false,
    createdAt: '2021-01-20',
    serviceName: 'custom',
  },
];

export const configuredSources = [
  {
    serviceType: 'gmail',
    name: 'Gmail',
    configured: false,
    needsPermissions: false,
    accountContextOnly: true,
    supportedByLicense: false,
    privateSourcesEnabled: false,
  },
  {
    serviceType: 'confluence_cloud',
    name: 'Confluence',
    configured: true,
    needsPermissions: true,
    accountContextOnly: false,
    supportedByLicense: true,
    privateSourcesEnabled: false,
  },
  {
    serviceType: 'confluence_server',
    name: 'Confluence (Server)',
    configured: true,
    needsPermissions: false,
    accountContextOnly: false,
    supportedByLicense: true,
    privateSourcesEnabled: false,
  },
  {
    serviceType: 'dropbox',
    name: 'Dropbox',
    configured: true,
    needsPermissions: false,
    accountContextOnly: false,
    supportedByLicense: true,
    privateSourcesEnabled: false,
  },
  {
    serviceType: 'github',
    name: 'GitHub',
    configured: true,
    needsPermissions: false,
    accountContextOnly: false,
    supportedByLicense: true,
    privateSourcesEnabled: false,
  },
  {
    serviceType: 'github_enterprise_server',
    name: 'GitHub Enterprise Server',
    configured: true,
    needsPermissions: false,
    accountContextOnly: false,
    supportedByLicense: true,
    privateSourcesEnabled: false,
  },
];

export const availableSources = [
  {
    serviceType: 'google_drive',
    name: 'Google Drive',
    configured: false,
    needsPermissions: true,
    accountContextOnly: false,
    supportedByLicense: true,
    privateSourcesEnabled: false,
  },
  {
    serviceType: 'jira_cloud',
    name: 'Jira',
    configured: false,
    needsPermissions: true,
    accountContextOnly: false,
    supportedByLicense: true,
    privateSourcesEnabled: false,
  },
  {
    serviceType: 'jira_server',
    name: 'Jira (Server)',
    configured: false,
    needsPermissions: false,
    accountContextOnly: false,
    supportedByLicense: true,
    privateSourcesEnabled: false,
  },
  {
    serviceType: 'one_drive',
    name: 'OneDrive',
    configured: false,
    needsPermissions: true,
    accountContextOnly: false,
    supportedByLicense: true,
    privateSourcesEnabled: false,
  },
  {
    serviceType: 'salesforce',
    name: 'Salesforce',
    configured: false,
    needsPermissions: false,
    accountContextOnly: false,
    supportedByLicense: true,
    privateSourcesEnabled: false,
  },
  {
    serviceType: 'salesforce_sandbox',
    name: 'Salesforce Sandbox',
    configured: false,
    needsPermissions: false,
    accountContextOnly: false,
    supportedByLicense: true,
    privateSourcesEnabled: false,
  },
  {
    serviceType: 'service_now',
    name: 'ServiceNow',
    configured: false,
    needsPermissions: false,
    accountContextOnly: false,
    supportedByLicense: true,
    privateSourcesEnabled: false,
  },
  {
    serviceType: 'share_point',
    name: 'SharePoint Online',
    configured: false,
    needsPermissions: true,
    accountContextOnly: false,
    supportedByLicense: true,
    privateSourcesEnabled: false,
  },
  {
    serviceType: 'slack',
    name: 'Slack',
    configured: false,
    needsPermissions: false,
    accountContextOnly: true,
    supportedByLicense: false,
    privateSourcesEnabled: false,
  },
  {
    serviceType: 'zendesk',
    name: 'Zendesk',
    configured: false,
    needsPermissions: false,
    accountContextOnly: false,
    supportedByLicense: true,
    privateSourcesEnabled: false,
  },
  {
    serviceType: 'custom',
    name: 'Custom API Source',
    configured: false,
    needsPermissions: true,
    accountContextOnly: false,
    supportedByLicense: true,
    privateSourcesEnabled: false,
  },
];

export const mergedAvailableSources = mergeServerAndStaticData(
  availableSources,
  staticSourceData,
  contentSources
);
export const mergedConfiguredSources = mergeServerAndStaticData(
  configuredSources,
  staticSourceData,
  contentSources
);

export const sourceConfigData = {
  serviceType: 'confluence_cloud',
  name: 'Confluence',
  configured: true,
  needsPermissions: true,
  accountContextOnly: false,
  supportedByLicense: true,
  privateSourcesEnabled: false,
  categories: ['wiki', 'atlassian', 'intranet'],
  configuredFields: {
    clientId: 'CyztADsSECRETCSAUCEh1a',
    clientSecret: 'GSjJxqSECRETCSAUCEksHk',
    baseUrl: 'https://mine.atlassian.net',
    privateKey: '-----BEGIN PRIVATE KEY-----\nkeykeykeykey==\n-----END PRIVATE KEY-----\n',
    publicKey: '-----BEGIN PUBLIC KEY-----\nkeykeykeykey\n-----END PUBLIC KEY-----\n',
    consumerKey: 'elastic_enterprise_search_123',
  },
};

export const oauthApplication = {
  name: 'app',
  uid: '123uid123',
  secret: 'shhhhhhhhh',
  redirectUri: 'https://foo',
  confidential: false,
  nativeRedirectUri: 'https://bar',
};

export const exampleResult = {
  sourceName: 'source',
  searchResultConfig: {
    titleField: 'otherTitle',
    subtitleField: 'otherSubtitle',
    urlField: 'myLink',
    color: '#e3e3e3',
    descriptionField: 'about',
    detailFields: [
      { fieldName: 'cats', label: 'Felines' },
      { fieldName: 'dogs', label: 'Canines' },
    ],
  },
  titleFieldHover: false,
  urlFieldHover: false,
  exampleDocuments: [
    {
      myLink: 'http://foo',
      otherTitle: 'foo',
    },
  ],
};

export const mostRecentIndexJob = {
  isActive: true,
  hasErrors: true,
  percentageComplete: 50,
  activeReindexJobId: '123',
  numDocumentsWithErrors: 1,
};

export const contentItems = [
  {
    id: '1234',
    last_updated: '2021-01-21',
  },
  {
    id: '1235',
    last_updated: '2021-01-20',
  },
];
