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
    iconPath: 'azure_blob_storage.svg',
    isBeta: true,
    isNative: false,
    keywords: ['cloud', 'azure', 'blob', 's3', 'connector'],
    name: i18n.translate('xpack.enterpriseSearch.content.nativeConnectors.azureBlob.name', {
      defaultMessage: 'Azure Blob Storage',
    }),
    serviceType: 'azure_blob_storage',
  },
  {
    iconPath: 'confluence_cloud.svg',
    isBeta: true,
    isNative: false,
    keywords: ['confluence', 'cloud', 'connector'],
    name: i18n.translate('xpack.enterpriseSearch.content.nativeConnectors.confluence.name', {
      defaultMessage: 'Confluence Cloud & Server',
    }),
    serviceType: 'confluence',
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
    iconPath: 'jira_cloud.svg',
    isBeta: true,
    isNative: false,
    keywords: ['jira', 'cloud', 'connector'],
    name: i18n.translate('xpack.enterpriseSearch.content.nativeConnectors.jira.name', {
      defaultMessage: 'Jira Cloud & Server',
    }),
    serviceType: 'jira',
  },
  {
    iconPath: 'network_drive.svg',
    isBeta: true,
    isNative: false,
    keywords: ['network', 'drive', 'file', 'directory', 'connector'],
    name: i18n.translate('xpack.enterpriseSearch.content.nativeConnectors.networkDrive.name', {
      defaultMessage: 'Network drive',
    }),
    serviceType: 'network_drive',
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
    iconPath: 'sharepoint_online.svg',
    isBeta: false,
    isNative: false,
    isTechPreview: true,
    keywords: ['sharepoint', 'cloud', 'connector'],
    name: i18n.translate('xpack.enterpriseSearch.content.nativeConnectors.sharepoint.name', {
      defaultMessage: 'Sharepoint Online & Server',
    }),
    serviceType: 'sharepoint',
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
