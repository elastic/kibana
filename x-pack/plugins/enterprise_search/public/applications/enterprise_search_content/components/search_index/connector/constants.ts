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
        value: '',
        label: i18n.translate(
          'xpack.enterpriseSearch.content.nativeConnectors.mongodb.configuration.hostLabel',
          {
            defaultMessage: 'MongoDB host',
          }
        ),
      },
      user: {
        value: '',
        label: i18n.translate(
          'xpack.enterpriseSearch.content.nativeConnectors.mongodb.configuration.usernameLabel',
          {
            defaultMessage: 'MongoDB username',
          }
        ),
      },
      password: {
        value: '',
        label: i18n.translate(
          'xpack.enterpriseSearch.content.nativeConnectors.mongodb.configuration.passwordLabel',
          {
            defaultMessage: 'MongoDB password',
          }
        ),
      },
      database: {
        value: '',
        label: i18n.translate(
          'xpack.enterpriseSearch.content.nativeConnectors.mongodb.configuration.databaseLabel',
          {
            defaultMessage: 'MongoDB database',
          }
        ),
      },
      collection: {
        value: '',
        label: i18n.translate(
          'xpack.enterpriseSearch.content.nativeConnectors.mongodb.configuration.collectionLabel',
          {
            defaultMessage: 'MongoDB collection',
          }
        ),
      },
      direct_connection: {
        value: '',
        label: i18n.translate(
          'xpack.enterpriseSearch.content.nativeConnectors.mongodb.configuration.directConnectionLabel',
          {
            defaultMessage: 'Use direct connection (true/false)',
          }
        ),
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
        value: '',
        label: i18n.translate(
          'xpack.enterpriseSearch.content.nativeConnectors.mysql.configuration.hostLabel',
          {
            defaultMessage: 'MySQL host',
          }
        ),
      },
      port: {
        value: '',
        label: i18n.translate(
          'xpack.enterpriseSearch.content.nativeConnectors.mysql.configuration.portLabel',
          {
            defaultMessage: 'MySQL port',
          }
        ),
      },
      user: {
        value: '',
        label: i18n.translate(
          'xpack.enterpriseSearch.content.nativeConnectors.mysql.configuration.usernameLabel',
          {
            defaultMessage: 'MySQL username',
          }
        ),
      },
      password: {
        value: '',
        label: i18n.translate(
          'xpack.enterpriseSearch.content.nativeConnectors.mysql.configuration.passwordLabel',
          {
            defaultMessage: 'MySQL password',
          }
        ),
      },
      database: {
        value: '',
        label: i18n.translate(
          'xpack.enterpriseSearch.content.nativeConnectors.mysql.configuration.databasesLabel',
          {
            defaultMessage: 'List of MySQL databases',
          }
        ),
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
