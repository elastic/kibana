/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

import { DisplayType, FeatureName, NativeConnector } from '../types/connectors';

export const NATIVE_CONNECTOR_DEFINITIONS: Record<string, NativeConnector | undefined> = {
  mongodb: {
    configuration: {
      host: {
        default_value: '',
        depends_on: [],
        display: DisplayType.TEXTBOX,
        label: i18n.translate(
          'xpack.enterpriseSearch.nativeConnectors.mongodb.configuration.hostLabel',
          {
            defaultMessage: 'Server hostname',
          }
        ),
        options: [],
        order: 1,
        required: true,
        sensitive: false,
        tooltip: '',
        type: 'str',
        ui_restrictions: [],
        validations: [],
        value: '',
      },
      user: {
        default_value: '',
        depends_on: [],
        display: DisplayType.TEXTBOX,
        label: i18n.translate(
          'xpack.enterpriseSearch.nativeConnectors.mongodb.configuration.usernameLabel',
          {
            defaultMessage: 'Username',
          }
        ),
        options: [],
        order: 2,
        required: false,
        sensitive: false,
        tooltip: '',
        type: 'str',
        ui_restrictions: [],
        validations: [],
        value: '',
      },
      password: {
        default_value: '',
        depends_on: [],
        display: DisplayType.TEXTBOX,
        label: i18n.translate(
          'xpack.enterpriseSearch.nativeConnectors.mongodb.configuration.passwordLabel',
          {
            defaultMessage: 'Password',
          }
        ),
        options: [],
        order: 3,
        required: false,
        sensitive: true,
        tooltip: '',
        type: 'str',
        ui_restrictions: [],
        validations: [],
        value: '',
      },
      database: {
        default_value: '',
        depends_on: [],
        display: DisplayType.TEXTBOX,
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
        tooltip: '',
        type: 'str',
        ui_restrictions: [],
        validations: [],
        value: '',
      },
      collection: {
        default_value: '',
        depends_on: [],
        display: DisplayType.TEXTBOX,
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
        tooltip: '',
        type: 'str',
        ui_restrictions: [],
        validations: [],
        value: '',
      },
      direct_connection: {
        default_value: false,
        depends_on: [],
        display: DisplayType.TOGGLE,
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
        tooltip: '',
        type: 'bool',
        ui_restrictions: [],
        validations: [],
        value: false,
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
        default_value: '',
        depends_on: [],
        display: DisplayType.TEXTBOX,
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
        tooltip: '',
        type: 'str',
        ui_restrictions: [],
        validations: [],
        value: '',
      },
      port: {
        default_value: null,
        depends_on: [],
        display: DisplayType.NUMERIC,
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
        tooltip: '',
        type: 'int',
        ui_restrictions: [],
        validations: [],
        value: '',
      },
      user: {
        default_value: '',
        depends_on: [],
        display: DisplayType.TEXTBOX,
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
        tooltip: '',
        type: 'str',
        ui_restrictions: [],
        validations: [],
        value: '',
      },
      password: {
        default_value: '',
        depends_on: [],
        display: DisplayType.TEXTBOX,
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
        tooltip: '',
        type: 'str',
        ui_restrictions: [],
        validations: [],
        value: '',
      },
      database: {
        default_value: '',
        depends_on: [],
        display: DisplayType.TEXTBOX,
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
        tooltip: '',
        type: 'str',
        ui_restrictions: [],
        validations: [],
        value: '',
      },
      tables: {
        default_value: '',
        depends_on: [],
        display: DisplayType.TEXTAREA,
        label: i18n.translate(
          'xpack.enterpriseSearch.nativeConnectors.mysql.configuration.tablesLabel',
          {
            defaultMessage: 'Comma-separated list of tables',
          }
        ),
        options: [],
        order: 6,
        required: true,
        sensitive: false,
        tooltip: '',
        type: 'list',
        ui_restrictions: [],
        validations: [],
        value: '',
      },
      ssl_enabled: {
        default_value: false,
        depends_on: [],
        display: DisplayType.TOGGLE,
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
        tooltip: '',
        type: 'bool',
        ui_restrictions: [],
        validations: [],
        value: false,
      },
      ssl_ca: {
        default_value: '',
        depends_on: [{ field: 'ssl_enabled', value: true }],
        display: DisplayType.TEXTBOX,
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
        tooltip: '',
        type: 'str',
        ui_restrictions: [],
        validations: [],
        value: '',
      },
      fetch_size: {
        default_value: 50,
        depends_on: [],
        display: DisplayType.NUMERIC,
        label: i18n.translate(
          'xpack.enterpriseSearch.nativeConnectors.mysql.configuration.rowsFetchedLabel',
          {
            defaultMessage: 'Rows fetched per request',
          }
        ),
        options: [],
        order: 9,
        required: false,
        sensitive: false,
        tooltip: '',
        type: 'int',
        ui_restrictions: ['advanced'],
        validations: [],
        value: 50,
      },
      retry_count: {
        default_value: 3,
        depends_on: [],
        display: DisplayType.NUMERIC,
        label: i18n.translate(
          'xpack.enterpriseSearch.nativeConnectors.mysql.configuration.retriesLabel',
          {
            defaultMessage: 'Retries per request',
          }
        ),
        options: [],
        order: 10,
        required: false,
        sensitive: false,
        tooltip: '',
        type: 'int',
        ui_restrictions: ['advanced'],
        validations: [],
        value: 3,
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
