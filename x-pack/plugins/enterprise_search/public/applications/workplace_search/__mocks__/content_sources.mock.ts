/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { groups } from './groups.mock';

import { IndexingRule } from '../types';
import { SourceConfigData } from '../views/content_sources/components/add_source/add_source_logic';
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
    activities: [],
    isOauth1: false,
  },
  {
    id: '124',
    serviceType: 'jira_cloud',
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
    activities: [],
    isOauth1: true,
  },
];

const defaultIndexingRules: IndexingRule[] = [
  {
    filterType: 'object_type',
    include: 'value',
  },
  {
    filterType: 'path_template',
    exclude: 'value',
  },
  {
    filterType: 'file_extension',
    include: 'value',
  },
];

const defaultIndexing = {
  enabled: true,
  defaultAction: 'include',
  rules: defaultIndexingRules,
  schedule: {
    full: 'P1D',
    incremental: 'PT2H',
    delete: 'PT10M',
    permissions: 'PT3H',
    blockedWindows: [],
    estimates: {
      full: {
        nextStart: '2021-09-30T15:37:38+00:00',
        duration: 'PT1M5S',
      },
      incremental: {
        nextStart: '2021-09-27T17:39:24+00:00',
        duration: 'PT2S',
      },
      delete: {
        nextStart: '2021-09-27T21:39:24+00:00',
        duration: 'PT49S',
      },
      permissions: {
        nextStart: '2021-09-27T17:39:24+00:00',
        duration: 'PT2S',
      },
    },
  },
  features: {
    contentExtraction: {
      enabled: true,
    },
    thumbnails: {
      enabled: true,
    },
  },
};

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
    indexing: defaultIndexing,
    groups,
    custom: false,
    isIndexedSource: true,
    isSyncConfigEnabled: true,
    areThumbnailsConfigEnabled: true,
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
    secret: {
      app_id: '99999',
      fingerprint: '65xM7s0RE6tEWNhnuXpK5EvZ5OAMIcbDHIISm/0T23Y=',
      base_url: 'http://github.com',
    },
  },
  {
    ...contentSources[1],
    activities: [],
    details: [],
    summary: [],
    groups: [],
    indexing: defaultIndexing,
    custom: true,
    isIndexedSource: true,
    isSyncConfigEnabled: true,
    areThumbnailsConfigEnabled: true,
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

export const sourceConfigData: SourceConfigData = {
  serviceType: 'confluence_cloud',
  name: 'Confluence',
  configured: true,
  needsPermissions: true,
  accountContextOnly: false,
  privateSourcesEnabled: false,
  categories: ['wiki', 'atlassian', 'intranet'],
  configuredFields: {
    clientId: 'CyztADsSECRETCSAUCEh1a',
    clientSecret: 'GSjJxqSECRETCSAUCEksHk',
    baseUrl: 'https://mine.atlassian.net',
    privateKey: '-----BEGIN PRIVATE KEY-----\nkeykeykeykey==\n-----END PRIVATE KEY-----\n',
    publicKey: '-----BEGIN PUBLIC KEY-----\nkeykeykeykey\n-----END PUBLIC KEY-----\n',
    consumerKey: 'elastic_enterprise_search_123',
    externalConnectorApiKey: 'asdf1234',
    externalConnectorUrl: 'https://www.elastic.co',
  },
};

export const externalConfiguredConnector = {
  serviceType: 'external',
  name: 'External Connector',
  configured: true,
  needsPermissions: false,
  accountContextOnly: true,
  supportedByLicense: false,
  privateSourcesEnabled: false,
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
    urlFieldIsLinkable: true,
    color: '#e3e3e3',
    descriptionField: 'about',
    typeField: 'otherType',
    mediaTypeField: 'otherMediaType',
    createdByField: 'otherCreatedBy',
    updatedByField: 'otherUpdatedBy',
    detailFields: [
      { fieldName: 'cats', label: 'Felines' },
      { fieldName: 'dogs', label: 'Canines' },
    ],
  },
  exampleDocuments: [
    {
      myLink: 'http://foo',
      otherTitle: 'foo',
      content_source_id: '60e85e7ea2564c265a88a4f0',
      id: 'doc-60e85eb7a2564c937a88a4f3',
      last_updated: '2021-07-09T14:35:35+00:00',
      updated_at: '2021-07-09T14:35:35+00:00',
      source: 'custom',
    },
  ],
  schemaFields: {},
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
