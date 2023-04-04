/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

import { CONNECTOR_ICONS } from '../../../../../assets/source_icons/native_connector_icons';

import { docLinks } from '../../../../shared/doc_links';

import { ConnectorDefinition } from './types';

export const CONNECTORS: ConnectorDefinition[] = [
  {
    docsUrl: docLinks.connectorsMongoDB,
    externalAuthDocsUrl: 'https://www.mongodb.com/docs/atlas/app-services/authentication/',
    externalDocsUrl: 'https://www.mongodb.com/docs/',
    icon: CONNECTOR_ICONS.mongodb,
    isBeta: false,
    isNative: true,
    name: i18n.translate('xpack.enterpriseSearch.content.nativeConnectors.mongodb.name', {
      defaultMessage: 'MongoDB',
    }),
    serviceType: 'mongodb',
  },
  {
    docsUrl: docLinks.connectorsMySQL,
    externalDocsUrl: 'https://dev.mysql.com/doc/',
    icon: CONNECTOR_ICONS.mysql,
    isBeta: false,
    isNative: true,
    name: i18n.translate('xpack.enterpriseSearch.content.nativeConnectors.mysql.name', {
      defaultMessage: 'MySQL',
    }),
    serviceType: 'mysql',
  },
  {
    externalAuthDocsUrl: 'https://learn.microsoft.com/azure/storage/common/authorize-data-access',
    externalDocsUrl: 'https://learn.microsoft.com/azure/storage/blobs/',
    icon: CONNECTOR_ICONS.azure_blob_storage,
    isBeta: true,
    isNative: false,
    name: i18n.translate('xpack.enterpriseSearch.content.nativeConnectors.azureBlob.name', {
      defaultMessage: 'Azure Blob Storage',
    }),
    serviceType: 'azure_blob_storage',
  },
  {
    externalAuthDocsUrl: 'https://cloud.google.com/storage/docs/authentication',
    externalDocsUrl: 'https://cloud.google.com/storage/docs',
    icon: CONNECTOR_ICONS.google_cloud_storage,
    isBeta: true,
    isNative: false,
    name: i18n.translate('xpack.enterpriseSearch.content.nativeConnectors.googleCloud.name', {
      defaultMessage: 'Google Cloud Storage',
    }),
    serviceType: 'google_cloud_storage',
  },
  {
    externalAuthDocsUrl:
      'https://learn.microsoft.com/sql/relational-databases/security/authentication-access/getting-started-with-database-engine-permissions',
    externalDocsUrl: 'https://learn.microsoft.com/sql/',
    icon: CONNECTOR_ICONS.microsoft_sql,
    isBeta: true,
    isNative: false,
    name: i18n.translate('xpack.enterpriseSearch.content.nativeConnectors.microsoftSQL.name', {
      defaultMessage: 'Microsoft SQL',
    }),
    serviceType: 'mssql',
  },
  {
    externalAuthDocsUrl: '',
    externalDocsUrl: '',
    icon: CONNECTOR_ICONS.network_drive,
    isBeta: true,
    isNative: false,
    name: i18n.translate('xpack.enterpriseSearch.content.nativeConnectors.networkDrive.name', {
      defaultMessage: 'Network drive',
    }),
    serviceType: 'network_drive',
  },
  {
    externalAuthDocsUrl:
      'https://docs.oracle.com/en/database/oracle/oracle-database/19/dbseg/index.html',
    externalDocsUrl: 'https://docs.oracle.com/database/oracle/oracle-database/',
    icon: CONNECTOR_ICONS.oracle,
    isBeta: true,
    isNative: false,
    name: i18n.translate('xpack.enterpriseSearch.content.nativeConnectors.oracle.name', {
      defaultMessage: 'Oracle',
    }),
    serviceType: 'oracle',
  },
  {
    externalAuthDocsUrl: 'https://www.postgresql.org/docs/15/auth-methods.html',
    externalDocsUrl: 'https://www.postgresql.org/docs/',
    icon: CONNECTOR_ICONS.postgresql,
    isBeta: true,
    isNative: false,
    name: i18n.translate('xpack.enterpriseSearch.content.nativeConnectors.postgresql.name', {
      defaultMessage: 'Postgresql',
    }),
    serviceType: 'postgresql',
  },
  {
    externalAuthDocsUrl: 'https://docs.aws.amazon.com/s3/index.html',
    externalDocsUrl: '',
    icon: CONNECTOR_ICONS.amazon_s3,
    isBeta: true,
    isNative: false,
    name: i18n.translate('xpack.enterpriseSearch.content.nativeConnectors.s3.name', {
      defaultMessage: 'S3',
    }),
    serviceType: 's3',
  },
  {
    externalAuthDocsUrl: '',
    externalDocsUrl: '',
    icon: CONNECTOR_ICONS.custom,
    isBeta: true,
    isNative: false,
    name: i18n.translate('xpack.enterpriseSearch.content.nativeConnectors.customConnector.name', {
      defaultMessage: 'Custom connector',
    }),
    serviceType: '',
  },
];

export const CUSTOM_CONNECTORS = CONNECTORS.filter(({ isNative }) => !isNative);

export const NATIVE_CONNECTORS = CONNECTORS.filter(({ isNative }) => isNative);
