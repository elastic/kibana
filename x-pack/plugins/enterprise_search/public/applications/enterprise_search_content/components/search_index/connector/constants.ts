/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { CONNECTOR_DEFINITIONS } from '../../../../../../common/connectors/connectors';

import { docLinks } from '../../../../shared/doc_links';
import { CONNECTOR_ICONS } from '../../../../shared/icons/connector_icons';

import { ConnectorClientSideDefinition } from './types';

export const CONNECTORS_DICT: Record<string, ConnectorClientSideDefinition> = {
  azure_blob_storage: {
    docsUrl: docLinks.connectorsAzureBlobStorage,
    externalAuthDocsUrl: 'https://learn.microsoft.com/azure/storage/common/authorize-data-access',
    externalDocsUrl: 'https://learn.microsoft.com/azure/storage/blobs/',
    icon: CONNECTOR_ICONS.azure_blob_storage,
  },
  custom: {
    docsUrl: docLinks.connectors,
    externalAuthDocsUrl: '',
    externalDocsUrl: '',
    icon: CONNECTOR_ICONS.custom,
  },
  google_cloud_storage: {
    docsUrl: docLinks.connectorsGoogleCloudStorage,
    externalAuthDocsUrl: 'https://cloud.google.com/storage/docs/authentication',
    externalDocsUrl: 'https://cloud.google.com/storage/docs',
    icon: CONNECTOR_ICONS.google_cloud_storage,
  },
  mongodb: {
    docsUrl: docLinks.connectorsMongoDB,
    externalAuthDocsUrl: 'https://www.mongodb.com/docs/atlas/app-services/authentication/',
    externalDocsUrl: 'https://www.mongodb.com/docs/',
    icon: CONNECTOR_ICONS.mongodb,
  },
  mssql: {
    docsUrl: docLinks.connectorsMicrosoftSQL,
    externalAuthDocsUrl:
      'https://learn.microsoft.com/sql/relational-databases/security/authentication-access/getting-started-with-database-engine-permissions',
    externalDocsUrl: 'https://learn.microsoft.com/sql/',
    icon: CONNECTOR_ICONS.microsoft_sql,
  },
  mysql: {
    docsUrl: docLinks.connectorsMySQL,
    externalDocsUrl: 'https://dev.mysql.com/doc/',
    icon: CONNECTOR_ICONS.mysql,
  },
  network_drive: {
    docsUrl: docLinks.connectorsNetworkDrive,
    externalAuthDocsUrl: '',
    externalDocsUrl: '',
    icon: CONNECTOR_ICONS.network_drive,
  },
  oracle: {
    docsUrl: docLinks.connectorsOracle,
    externalAuthDocsUrl:
      'https://docs.oracle.com/en/database/oracle/oracle-database/19/dbseg/index.html',
    externalDocsUrl: 'https://docs.oracle.com/database/oracle/oracle-database/',
    icon: CONNECTOR_ICONS.oracle,
  },
  postgresql: {
    docsUrl: docLinks.connectorsPostgreSQL,
    externalAuthDocsUrl: 'https://www.postgresql.org/docs/15/auth-methods.html',
    externalDocsUrl: 'https://www.postgresql.org/docs/',
    icon: CONNECTOR_ICONS.postgresql,
  },
  s3: {
    docsUrl: docLinks.connectorsS3,
    externalAuthDocsUrl: 'https://docs.aws.amazon.com/s3/index.html',
    externalDocsUrl: '',
    icon: CONNECTOR_ICONS.amazon_s3,
  },
};

export const CONNECTORS = CONNECTOR_DEFINITIONS.map((connector) => ({
  ...connector,
  ...(connector.serviceType && CONNECTORS_DICT[connector.serviceType]
    ? CONNECTORS_DICT[connector.serviceType]
    : CONNECTORS_DICT.custom),
}));

export const CUSTOM_CONNECTORS = CONNECTORS.filter(({ isNative }) => !isNative);

export const NATIVE_CONNECTORS = CONNECTORS.filter(({ isNative }) => isNative);
