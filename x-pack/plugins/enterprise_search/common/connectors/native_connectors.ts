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
        depends_on: [],
        display: 'textbox',
        label: i18n.translate(
          'xpack.enterpriseSearch.nativeConnectors.mongodb.configuration.hostLabel',
          {
            defaultMessage: 'Host',
          }
        ),
        options: [],
        order: 1,
        required: true,
        sensitive: false,
        value: '',
      },
      user: {
        depends_on: [],
        display: 'textbox',
        label: i18n.translate(
          'xpack.enterpriseSearch.nativeConnectors.mongodb.configuration.usernameLabel',
          {
            defaultMessage: 'Username',
          }
        ),
        options: [],
        order: 2,
        required: true,
        sensitive: false,
        value: '',
      },
      password: {
        depends_on: [],
        display: 'textbox',
        label: i18n.translate(
          'xpack.enterpriseSearch.nativeConnectors.mongodb.configuration.passwordLabel',
          {
            defaultMessage: 'Password',
          }
        ),
        options: [],
        order: 3,
        required: true,
        sensitive: true,
        value: '',
      },
      database: {
        depends_on: [],
        display: 'textbox',
        label: i18n.translate(
          'xpack.enterpriseSearch.nativeConnectors.mongodb.configuration.databaseLabel',
          {
            defaultMessage: 'Database',
          }
        ),
        options: [],
        order: 4,
        required: true,
        sensitive: false,
        value: '',
      },
      collection: {
        depends_on: [],
        display: 'textbox',
        label: i18n.translate(
          'xpack.enterpriseSearch.nativeConnectors.mongodb.configuration.collectionLabel',
          {
            defaultMessage: 'Collection',
          }
        ),
        options: [],
        order: 5,
        required: true,
        sensitive: false,
        value: '',
      },
      direct_connection: {
        depends_on: [],
        display: 'toggle',
        label: i18n.translate(
          'xpack.enterpriseSearch.nativeConnectors.mongodb.configuration.directConnectionLabel',
          {
            defaultMessage: 'Direct connection',
          }
        ),
        options: [],
        order: 6,
        required: true,
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
        depends_on: [],
        display: 'textbox',
        label: i18n.translate(
          'xpack.enterpriseSearch.nativeConnectors.mysql.configuration.hostLabel',
          {
            defaultMessage: 'Host',
          }
        ),
        options: [],
        order: 1,
        required: true,
        sensitive: false,
        value: '',
      },
      port: {
        depends_on: [],
        display: 'numeric',
        label: i18n.translate(
          'xpack.enterpriseSearch.nativeConnectors.mysql.configuration.portLabel',
          {
            defaultMessage: 'Port',
          }
        ),
        options: [],
        order: 2,
        required: true,
        sensitive: false,
        value: '',
      },
      user: {
        depends_on: [],
        display: 'textbox',
        label: i18n.translate(
          'xpack.enterpriseSearch.nativeConnectors.mysql.configuration.usernameLabel',
          {
            defaultMessage: 'Username',
          }
        ),
        options: [],
        order: 3,
        required: false,
        sensitive: false,
        value: '',
      },
      password: {
        depends_on: [],
        display: 'textbox',
        label: i18n.translate(
          'xpack.enterpriseSearch.nativeConnectors.mysql.configuration.passwordLabel',
          {
            defaultMessage: 'Password',
          }
        ),
        options: [],
        order: 4,
        required: false,
        sensitive: true,
        value: '',
      },
      database: {
        depends_on: [],
        display: 'textbox',
        label: i18n.translate(
          'xpack.enterpriseSearch.nativeConnectors.mysql.configuration.databaseLabel',
          {
            defaultMessage: 'Database',
          }
        ),
        options: [],
        order: 5,
        required: true,
        sensitive: false,
        value: '',
      },
      tables: {
        depends_on: [],
        display: 'textarea',
        label: i18n.translate(
          'xpack.enterpriseSearch.nativeConnectors.mysql.configuration.tablesLabel',
          {
            defaultMessage: 'Tables',
          }
        ),
        options: [],
        order: 6,
        required: true,
        sensitive: false,
        value: '',
      },
      ssl_enabled: {
        depends_on: [],
        display: 'toggle',
        label: i18n.translate(
          'xpack.enterpriseSearch.nativeConnectors.mysql.configuration.sslEnabledLabel',
          {
            defaultMessage: 'Enable SSL',
          }
        ),
        options: [],
        order: 7,
        required: true,
        sensitive: false,
        value: false,
      },
      ssl_ca: {
        depends_on: [{ field: 'ssl_enabled', value: true }],
        display: 'textbox',
        label: i18n.translate(
          'xpack.enterpriseSearch.nativeConnectors.mysql.configuration.sslCertificateLabel',
          {
            defaultMessage: 'SSL certificate',
          }
        ),
        options: [],
        order: 8,
        required: true,
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
