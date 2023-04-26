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
        display: 'textbox',
        label: i18n.translate(
          'xpack.enterpriseSearch.nativeConnectors.mongodb.configuration.hostLabel',
          {
            defaultMessage: 'Host',
          }
        ),
        options: [],
        order: 1,
        sensitive: false,
        value: '',
      },
      user: {
        display: 'textbox',
        label: i18n.translate(
          'xpack.enterpriseSearch.nativeConnectors.mongodb.configuration.usernameLabel',
          {
            defaultMessage: 'Username',
          }
        ),
        options: [],
        order: 2,
        sensitive: false,
        value: '',
      },
      password: {
        display: 'textbox',
        label: i18n.translate(
          'xpack.enterpriseSearch.nativeConnectors.mongodb.configuration.passwordLabel',
          {
            defaultMessage: 'Password',
          }
        ),
        options: [],
        order: 3,
        sensitive: true,
        value: '',
      },
      database: {
        display: 'textbox',
        label: i18n.translate(
          'xpack.enterpriseSearch.nativeConnectors.mongodb.configuration.databaseLabel',
          {
            defaultMessage: 'Database',
          }
        ),
        options: [],
        order: 4,
        sensitive: false,
        value: '',
      },
      collection: {
        display: 'textbox',
        label: i18n.translate(
          'xpack.enterpriseSearch.nativeConnectors.mongodb.configuration.collectionLabel',
          {
            defaultMessage: 'Collection',
          }
        ),
        options: [],
        order: 5,
        sensitive: false,
        value: '',
      },
      direct_connection: {
        display: 'toggle',
        label: i18n.translate(
          'xpack.enterpriseSearch.nativeConnectors.mongodb.configuration.directConnectionLabel',
          {
            defaultMessage: 'Direct connection',
          }
        ),
        options: [],
        order: 6,
        sensitive: false,
        value: true,
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
        display: 'textbox',
        label: i18n.translate(
          'xpack.enterpriseSearch.nativeConnectors.mysql.configuration.hostLabel',
          {
            defaultMessage: 'Host',
          }
        ),
        options: [],
        order: 1,
        sensitive: false,
        value: '',
      },
      port: {
        display: 'numeric',
        label: i18n.translate(
          'xpack.enterpriseSearch.nativeConnectors.mysql.configuration.portLabel',
          {
            defaultMessage: 'Port',
          }
        ),
        options: [],
        order: 2,
        sensitive: false,
        value: '',
      },
      user: {
        display: 'textbox',
        label: i18n.translate(
          'xpack.enterpriseSearch.nativeConnectors.mysql.configuration.usernameLabel',
          {
            defaultMessage: 'Username',
          }
        ),
        options: [],
        order: 3,
        sensitive: false,
        value: '',
      },
      password: {
        display: 'textbox',
        label: i18n.translate(
          'xpack.enterpriseSearch.nativeConnectors.mysql.configuration.passwordLabel',
          {
            defaultMessage: 'Password',
          }
        ),
        options: [],
        order: 4,
        sensitive: true,
        value: '',
      },
      database: {
        display: 'textbox',
        label: i18n.translate(
          'xpack.enterpriseSearch.nativeConnectors.mysql.configuration.databaseLabel',
          {
            defaultMessage: 'Database',
          }
        ),
        options: [],
        order: 5,
        sensitive: false,
        value: '',
      },
      tables: {
        display: 'textarea',
        label: i18n.translate(
          'xpack.enterpriseSearch.nativeConnectors.mysql.configuration.tablesLabel',
          {
            defaultMessage: 'Tables',
          }
        ),
        options: [],
        order: 6,
        sensitive: false,
        value: '',
      },
      ssl_enabled: {
        display: 'toggle',
        label: i18n.translate(
          'xpack.enterpriseSearch.nativeConnectors.mysql.configuration.sslEnabledLabel',
          {
            defaultMessage: 'Enable SSL',
          }
        ),
        options: [],
        order: 7,
        sensitive: false,
        value: false,
      },
      ssl_ca: {
        display: 'textbox',
        label: i18n.translate(
          'xpack.enterpriseSearch.nativeConnectors.mysql.configuration.sslCertificateLabel',
          {
            defaultMessage: 'SSL certificate',
          }
        ),
        options: [],
        order: 8,
        sensitive: false,
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
