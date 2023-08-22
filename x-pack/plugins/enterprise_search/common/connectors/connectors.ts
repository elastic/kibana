/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

export interface ConnectorServerSideDefinition {
  iconPath: string;
  isBeta: boolean;
  isNative: boolean;
  isTechPreview?: boolean;
  keywords: string[];
  name: string;
  serviceType: string;
}

export const CONNECTOR_DEFINITIONS: ConnectorServerSideDefinition[] = [
  {
    iconPath: 'azure_blob_storage.svg',
    isBeta: true,
    isNative: true,
    keywords: ['cloud', 'azure', 'blob', 's3', 'connector'],
    name: i18n.translate('xpack.enterpriseSearch.content.nativeConnectors.azureBlob.name', {
      defaultMessage: 'Azure Blob Storage',
    }),
    serviceType: 'azure_blob_storage',
  },
  {
    iconPath: 'confluence_cloud.svg',
    isBeta: true,
    isNative: true,
    keywords: ['confluence', 'cloud', 'connector'],
    name: i18n.translate('xpack.enterpriseSearch.content.nativeConnectors.confluence.name', {
      defaultMessage: 'Confluence Cloud & Server',
    }),
    serviceType: 'confluence',
  },
  {
    iconPath: 'dropbox.svg',
    isBeta: true,
    isNative: true,
    isTechPreview: false,
    keywords: ['dropbox', 'connector'],
    name: i18n.translate('xpack.enterpriseSearch.content.nativeConnectors.dropbox.name', {
      defaultMessage: 'Dropbox',
    }),
    serviceType: 'dropbox',
  },
  {
    iconPath: 'jira_cloud.svg',
    isBeta: true,
    isNative: true,
    keywords: ['jira', 'cloud', 'connector'],
    name: i18n.translate('xpack.enterpriseSearch.content.nativeConnectors.jira.name', {
      defaultMessage: 'Jira Cloud & Server',
    }),
    serviceType: 'jira',
  },
  {
    iconPath: 'github.svg',
    isBeta: true,
    isNative: false,
    keywords: ['github', 'cloud', 'connector'],
    name: i18n.translate('xpack.enterpriseSearch.content.nativeConnectors.github.name', {
      defaultMessage: 'GitHub & GitHub Enterprise Server',
    }),
    serviceType: 'github',
  },
  {
    iconPath: 'google_cloud_storage.svg',
    isBeta: true,
    isNative: false,
    keywords: ['google', 'cloud', 'blob', 's3', 'connector'],
    name: i18n.translate('xpack.enterpriseSearch.content.nativeConnectors.googleCloud.name', {
      defaultMessage: 'Google Cloud Storage',
    }),
    serviceType: 'google_cloud_storage',
  },
  {
    iconPath: 'google_drive.svg',
    isBeta: true,
    isNative: false,
    keywords: ['google', 'drive', 'connector'],
    name: i18n.translate('xpack.enterpriseSearch.content.nativeConnectors.googleDrive.name', {
      defaultMessage: 'Google Drive',
    }),
    serviceType: 'google_drive',
  },
  {
    iconPath: 'mongodb.svg',
    isBeta: false,
    isNative: true,
    keywords: ['mongo', 'mongodb', 'database', 'nosql', 'connector'],
    name: i18n.translate('xpack.enterpriseSearch.content.nativeConnectors.mongodb.name', {
      defaultMessage: 'MongoDB',
    }),
    serviceType: 'mongodb',
  },
  {
    iconPath: 'mysql.svg',
    isBeta: false,
    isNative: true,
    keywords: ['mysql', 'sql', 'database', 'connector'],
    name: i18n.translate('xpack.enterpriseSearch.content.nativeConnectors.mysql.name', {
      defaultMessage: 'MySQL',
    }),
    serviceType: 'mysql',
  },
  {
    iconPath: 'mssql.svg',
    isBeta: true,
    isNative: true,
    keywords: ['mssql', 'microsoft', 'sql', 'database', 'connector'],
    name: i18n.translate('xpack.enterpriseSearch.content.nativeConnectors.microsoftSQL.name', {
      defaultMessage: 'Microsoft SQL',
    }),
    serviceType: 'mssql',
  },
  {
    iconPath: 'network_drive.svg',
    isBeta: true,
    isNative: true,
    keywords: ['network', 'drive', 'file', 'directory', 'connector'],
    name: i18n.translate('xpack.enterpriseSearch.content.nativeConnectors.networkDrive.name', {
      defaultMessage: 'Network drive',
    }),
    serviceType: 'network_drive',
  },
  {
    iconPath: 'postgresql.svg',
    isBeta: true,
    isNative: true,
    keywords: ['postgresql', 'sql', 'database', 'connector'],
    name: i18n.translate('xpack.enterpriseSearch.content.nativeConnectors.postgresql.name', {
      defaultMessage: 'PostgreSQL',
    }),
    serviceType: 'postgresql',
  },
  {
    iconPath: 'servicenow.svg',
    isBeta: true,
    isNative: true,
    isTechPreview: false,
    keywords: ['servicenow', 'cloud', 'connector'],
    name: i18n.translate('xpack.enterpriseSearch.content.nativeConnectors.serviceNow.name', {
      defaultMessage: 'ServiceNow',
    }),
    serviceType: 'servicenow',
  },
  {
    iconPath: 'sharepoint_online.svg',
    isBeta: false,
    isNative: true,
    isTechPreview: false,
    keywords: ['sharepoint', 'office365', 'cloud', 'connector'],
    name: i18n.translate('xpack.enterpriseSearch.content.nativeConnectors.sharepoint_online.name', {
      defaultMessage: 'Sharepoint Online',
    }),
    serviceType: 'sharepoint_online',
  },
  {
    iconPath: 'gmail.svg',
    isBeta: false,
    isNative: false,
    isTechPreview: true,
    keywords: ['google', 'gmail', 'connector', 'mail'],
    name: i18n.translate('xpack.enterpriseSearch.content.nativeConnectors.gmail.name', {
      defaultMessage: 'Gmail',
    }),
    serviceType: 'gmail',
  },
  {
    iconPath: 'oracle.svg',
    isBeta: true,
    isNative: false,
    keywords: ['oracle', 'sql', 'database', 'connector'],
    name: i18n.translate('xpack.enterpriseSearch.content.nativeConnectors.oracle.name', {
      defaultMessage: 'Oracle',
    }),
    serviceType: 'oracle',
  },
  {
    iconPath: 'onedrive.svg',
    isBeta: true,
    isNative: false,
    keywords: ['network', 'drive', 'file', 'connector'],
    name: i18n.translate('xpack.enterpriseSearch.content.nativeConnectors.oneDrive.name', {
      defaultMessage: 'OneDrive',
    }),
    serviceType: 'onedrive',
  },
  {
    iconPath: 's3.svg',
    isBeta: true,
    isNative: false,
    keywords: ['s3', 'cloud', 'amazon', 'connector'],
    name: i18n.translate('xpack.enterpriseSearch.content.nativeConnectors.s3.name', {
      defaultMessage: 'S3',
    }),
    serviceType: 's3',
  },
  {
    iconPath: 'slack.svg',
    isBeta: false,
    isNative: false,
    isTechPreview: true,
    keywords: ['slack', 'connector'],
    name: i18n.translate('xpack.enterpriseSearch.content.nativeConnectors.slack.name', {
      defaultMessage: 'Slack',
    }),
    serviceType: 'slack',
  },
  {
    iconPath: 'sharepoint_server.svg',
    isBeta: true,
    isNative: false,
    isTechPreview: false,
    keywords: ['sharepoint', 'cloud', 'connector'],
    name: i18n.translate('xpack.enterpriseSearch.content.nativeConnectors.sharepointServer.name', {
      defaultMessage: 'Sharepoint Server',
    }),
    serviceType: 'sharepoint_server',
  },
  {
    iconPath: 'custom.svg',
    isBeta: true,
    isNative: false,
    keywords: ['custom', 'connector', 'code'],
    name: i18n.translate('xpack.enterpriseSearch.content.nativeConnectors.customConnector.name', {
      defaultMessage: 'Customized connector',
    }),
    serviceType: '',
  },
];
