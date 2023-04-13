/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

import { FeatureName, NativeConnector } from '../types/connectors';

export const NATIVE_CONNECTOR_DEFINITIONS: Record<string, NativeConnector | undefined> = {
  mongodb: {
    configuration: {
      host: {
        label: i18n.translate(
          'xpack.enterpriseSearch.nativeConnectors.mongodb.configuration.hostLabel',
          {
            defaultMessage: 'Host',
          }
        ),
        order: 0,
        value: '',
      },
      user: {
        label: i18n.translate(
          'xpack.enterpriseSearch.nativeConnectors.mongodb.configuration.usernameLabel',
          {
            defaultMessage: 'Username',
          }
        ),
        order: 1,
        value: '',
      },
      password: {
        label: i18n.translate(
          'xpack.enterpriseSearch.nativeConnectors.mongodb.configuration.passwordLabel',
          {
            defaultMessage: 'Password',
          }
        ),
        order: 2,
        value: '',
      },
      database: {
        label: i18n.translate(
          'xpack.enterpriseSearch.nativeConnectors.mongodb.configuration.databaseLabel',
          {
            defaultMessage: 'Database',
          }
        ),
        order: 3,
        value: '',
      },
      collection: {
        label: i18n.translate(
          'xpack.enterpriseSearch.nativeConnectors.mongodb.configuration.collectionLabel',
          {
            defaultMessage: 'Collection',
          }
        ),
        order: 4,
        value: '',
      },
      direct_connection: {
        label: i18n.translate(
          'xpack.enterpriseSearch.nativeConnectors.mongodb.configuration.directConnectionLabel',
          {
            defaultMessage: 'Direct connection (true/false)',
          }
        ),
        order: 5,
        value: '',
      },
    },
    features: {
      [FeatureName.FILTERING_ADVANCED_CONFIG]: true,
      [FeatureName.FILTERING_RULES]: true,
      [FeatureName.SYNC_RULES]: {
        advanced: { enabled: true },
        basic: { enabled: true },
      },
    },
    name: i18n.translate('xpack.enterpriseSearch.nativeConnectors.mongodb.name', {
      defaultMessage: 'MongoDB',
    }),
    serviceType: 'mongodb',
  },
  mysql: {
    configuration: {
      host: {
        label: i18n.translate(
          'xpack.enterpriseSearch.nativeConnectors.mysql.configuration.hostLabel',
          {
            defaultMessage: 'Host',
          }
        ),
        order: 0,
        value: '',
      },
      port: {
        label: i18n.translate(
          'xpack.enterpriseSearch.nativeConnectors.mysql.configuration.portLabel',
          {
            defaultMessage: 'Port',
          }
        ),
        order: 1,
        value: '',
      },
      user: {
        label: i18n.translate(
          'xpack.enterpriseSearch.nativeConnectors.mysql.configuration.usernameLabel',
          {
            defaultMessage: 'Username',
          }
        ),
        order: 2,
        value: '',
      },
      password: {
        value: '',
        order: 3,
        label: i18n.translate(
          'xpack.enterpriseSearch.nativeConnectors.mysql.configuration.passwordLabel',
          {
            defaultMessage: 'Password',
          }
        ),
      },
      database: {
        label: i18n.translate(
          'xpack.enterpriseSearch.nativeConnectors.mysql.configuration.databaseLabel',
          {
            defaultMessage: 'Database',
          }
        ),
        order: 4,
        value: '',
      },
      tables: {
        label: i18n.translate(
          'xpack.enterpriseSearch.nativeConnectors.mysql.configuration.tablesLabel',
          {
            defaultMessage: 'Tables',
          }
        ),
        order: 5,
        value: '',
      },
      ssl_disabled: {
        label: i18n.translate(
          'xpack.enterpriseSearch.nativeConnectors.mysql.configuration.sslDisabledLabel',
          {
            defaultMessage: 'Disable SSL (true/false)',
          }
        ),
        order: 6,
        value: 'true',
      },
      ssl_ca: {
        label: i18n.translate(
          'xpack.enterpriseSearch.nativeConnectors.mysql.configuration.sslCertificateLabel',
          {
            defaultMessage: 'SSL certificate',
          }
        ),
        order: 7,
        value: '',
      },
    },
    features: {
      [FeatureName.SYNC_RULES]: {
        advanced: { enabled: true },
        basic: { enabled: true },
      },
    },
    name: i18n.translate('xpack.enterpriseSearch.nativeConnectors.mysql.name', {
      defaultMessage: 'MySQL',
    }),
    serviceType: 'mysql',
  },
};
