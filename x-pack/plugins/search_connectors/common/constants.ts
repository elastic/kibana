/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ConnectorClientSideDefinition } from './types';
import { docLinks } from './doc_links';

// needs to be a function because, docLinks are only populated with actual
// documentation links in browser after SearchConnectorsPlugin starts
export const getConnectorsDict = (): Record<string, ConnectorClientSideDefinition> => ({
  azure_blob_storage: {
    docsUrl: docLinks.connectorsAzureBlobStorage,
    externalAuthDocsUrl: 'https://learn.microsoft.com/azure/storage/common/authorize-data-access',
    externalDocsUrl: 'https://learn.microsoft.com/azure/storage/blobs/',
    platinumOnly: true,
  },
  box: {
    docsUrl: docLinks.connectorsBox,
    externalAuthDocsUrl: '',
    externalDocsUrl: '',
    platinumOnly: true,
  },
  confluence: {
    docsUrl: docLinks.connectorsConfluence,
    externalAuthDocsUrl: '',
    externalDocsUrl: '',
    platinumOnly: true,
  },
  custom: {
    docsUrl: docLinks.connectors,
    externalAuthDocsUrl: '',
    externalDocsUrl: '',
  },
  dropbox: {
    docsUrl: docLinks.connectorsDropbox,
    externalAuthDocsUrl: '',
    externalDocsUrl: '',
    platinumOnly: true,
  },
  github: {
    docsUrl: docLinks.connectorsGithub,
    externalAuthDocsUrl: '',
    externalDocsUrl: '',
    platinumOnly: true,
  },
  gmail: {
    docsUrl: docLinks.connectorsGmail,
    externalAuthDocsUrl: '',
    externalDocsUrl: '',
    platinumOnly: true,
  },
  google_cloud_storage: {
    docsUrl: docLinks.connectorsGoogleCloudStorage,
    externalAuthDocsUrl: 'https://cloud.google.com/storage/docs/authentication',
    externalDocsUrl: 'https://cloud.google.com/storage/docs',
    platinumOnly: true,
  },
  google_drive: {
    docsUrl: docLinks.connectorsGoogleDrive,
    externalAuthDocsUrl: 'https://cloud.google.com/iam/docs/service-account-overview',
    externalDocsUrl: 'https://developers.google.com/drive',
    platinumOnly: true,
  },
  jira: {
    docsUrl: docLinks.connectorsJira,
    externalAuthDocsUrl: '',
    externalDocsUrl: '',
    platinumOnly: true,
  },
  microsoft_teams: {
    docsUrl: docLinks.connectorsTeams,
    externalAuthDocsUrl: '',
    externalDocsUrl: '',
    platinumOnly: true,
  },
  mongodb: {
    docsUrl: docLinks.connectorsMongoDB,
    externalAuthDocsUrl: 'https://www.mongodb.com/docs/atlas/app-services/authentication/',
    externalDocsUrl: 'https://www.mongodb.com/docs/',
    platinumOnly: true,
  },
  mssql: {
    docsUrl: docLinks.connectorsMicrosoftSQL,
    externalAuthDocsUrl:
      'https://learn.microsoft.com/sql/relational-databases/security/authentication-access/getting-started-with-database-engine-permissions',
    externalDocsUrl: 'https://learn.microsoft.com/sql/',
    platinumOnly: true,
  },
  mysql: {
    docsUrl: docLinks.connectorsMySQL,
    externalDocsUrl: 'https://dev.mysql.com/doc/',
    platinumOnly: true,
  },
  network_drive: {
    docsUrl: docLinks.connectorsNetworkDrive,
    externalAuthDocsUrl: '',
    externalDocsUrl: '',
    platinumOnly: true,
  },
  notion: {
    docsUrl: docLinks.connectorsNotion,
    externalAuthDocsUrl: '',
    externalDocsUrl: '',
    platinumOnly: true,
  },
  onedrive: {
    docsUrl: docLinks.connectorsOneDrive,
    externalAuthDocsUrl: '',
    externalDocsUrl: '',
    platinumOnly: true,
  },
  oracle: {
    docsUrl: docLinks.connectorsOracle,
    externalAuthDocsUrl:
      'https://docs.oracle.com/en/database/oracle/oracle-database/19/dbseg/index.html',
    externalDocsUrl: 'https://docs.oracle.com/database/oracle/oracle-database/',
    platinumOnly: true,
  },
  outlook: {
    docsUrl: docLinks.connectorsOutlook,
    externalAuthDocsUrl: '',
    externalDocsUrl: '',
    platinumOnly: true,
  },
  postgresql: {
    docsUrl: docLinks.connectorsPostgreSQL,
    externalAuthDocsUrl: 'https://www.postgresql.org/docs/15/auth-methods.html',
    externalDocsUrl: 'https://www.postgresql.org/docs/',
    platinumOnly: true,
  },
  redis: {
    docsUrl: docLinks.connectorsRedis,
    externalAuthDocsUrl: '',
    externalDocsUrl: '',
    platinumOnly: true,
  },
  s3: {
    docsUrl: docLinks.connectorsS3,
    externalAuthDocsUrl: 'https://docs.aws.amazon.com/s3/index.html',
    externalDocsUrl: '',
    platinumOnly: true,
  },
  salesforce: {
    docsUrl: docLinks.connectorsSalesforce,
    externalAuthDocsUrl: '',
    externalDocsUrl: '',
    platinumOnly: true,
  },
  servicenow: {
    docsUrl: docLinks.connectorsServiceNow,
    externalAuthDocsUrl: '',
    externalDocsUrl: '',
    platinumOnly: true,
  },
  sharepoint_online: {
    docsUrl: docLinks.connectorsSharepointOnline,
    externalAuthDocsUrl: '',
    externalDocsUrl: '',
    platinumOnly: true,
  },
  sharepoint_server: {
    docsUrl: docLinks.connectorsSharepoint,
    externalAuthDocsUrl: '',
    externalDocsUrl: '',
    platinumOnly: true,
  },
  slack: {
    docsUrl: docLinks.connectorsSlack,
    externalAuthDocsUrl: '',
    externalDocsUrl: '',
    platinumOnly: true,
  },
  zoom: {
    docsUrl: docLinks.connectorsZoom,
    externalAuthDocsUrl: '',
    externalDocsUrl: '',
    platinumOnly: true,
  },
});
