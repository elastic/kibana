/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

import { docLinks } from '../../../../shared/doc_links';

import { NativeConnector } from './types';

export const NATIVE_CONNECTORS: NativeConnector[] = [
  {
    configuration: {
      host: {
        label: i18n.translate(
          'xpack.enterpriseSearch.content.nativeConnectors.mongodb.configuration.hostLabel',
          {
            defaultMessage: 'Host',
          }
        ),
        value: '',
      },
      user: {
        label: i18n.translate(
          'xpack.enterpriseSearch.content.nativeConnectors.mongodb.configuration.usernameLabel',
          {
            defaultMessage: 'Username',
          }
        ),
        value: '',
      },
      password: {
        label: i18n.translate(
          'xpack.enterpriseSearch.content.nativeConnectors.mongodb.configuration.passwordLabel',
          {
            defaultMessage: 'Password',
          }
        ),
        value: '',
      },
      database: {
        label: i18n.translate(
          'xpack.enterpriseSearch.content.nativeConnectors.mongodb.configuration.databaseLabel',
          {
            defaultMessage: 'Database',
          }
        ),
        value: '',
      },
      collection: {
        label: i18n.translate(
          'xpack.enterpriseSearch.content.nativeConnectors.mongodb.configuration.collectionLabel',
          {
            defaultMessage: 'Collection',
          }
        ),
        value: '',
      },
      direct_connection: {
        label: i18n.translate(
          'xpack.enterpriseSearch.content.nativeConnectors.mongodb.configuration.directConnectionLabel',
          {
            defaultMessage: 'Direct connection (true/false)',
          }
        ),
        value: '',
      },
    },
    docsUrl: docLinks.connectorsMongoDB,
    externalAuthDocsUrl: 'https://www.mongodb.com/docs/atlas/app-services/authentication/',
    externalDocsUrl: 'https://www.mongodb.com/docs/',
    name: i18n.translate('xpack.enterpriseSearch.content.nativeConnectors.mongodb.name', {
      defaultMessage: 'MongoDB',
    }),
    serviceType: 'mongodb',
  },
  {
    configuration: {
      host: {
        label: i18n.translate(
          'xpack.enterpriseSearch.content.nativeConnectors.mysql.configuration.hostLabel',
          {
            defaultMessage: 'Host',
          }
        ),
        value: '',
      },
      port: {
        label: i18n.translate(
          'xpack.enterpriseSearch.content.nativeConnectors.mysql.configuration.portLabel',
          {
            defaultMessage: 'Port',
          }
        ),
        value: '',
      },
      user: {
        label: i18n.translate(
          'xpack.enterpriseSearch.content.nativeConnectors.mysql.configuration.usernameLabel',
          {
            defaultMessage: 'Username',
          }
        ),
        value: '',
      },
      password: {
        value: '',
        label: i18n.translate(
          'xpack.enterpriseSearch.content.nativeConnectors.mysql.configuration.passwordLabel',
          {
            defaultMessage: 'Password',
          }
        ),
      },
      database: {
        label: i18n.translate(
          'xpack.enterpriseSearch.content.nativeConnectors.mysql.configuration.databasesLabel',
          {
            defaultMessage: 'Databases',
          }
        ),
        value: '',
      },
    },
    docsUrl: docLinks.connectorsMySQL,
    externalDocsUrl: 'https://dev.mysql.com/doc/',
    name: i18n.translate('xpack.enterpriseSearch.content.nativeConnectors.mysql.name', {
      defaultMessage: 'MySQL',
    }),
    serviceType: 'mysql',
  },
];
