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
        value: '',
      },
      user: {
        label: i18n.translate(
          'xpack.enterpriseSearch.nativeConnectors.mongodb.configuration.usernameLabel',
          {
            defaultMessage: 'Username',
          }
        ),
        value: '',
      },
      password: {
        label: i18n.translate(
          'xpack.enterpriseSearch.nativeConnectors.mongodb.configuration.passwordLabel',
          {
            defaultMessage: 'Password',
          }
        ),
        value: '',
      },
      database: {
        label: i18n.translate(
          'xpack.enterpriseSearch.nativeConnectors.mongodb.configuration.databaseLabel',
          {
            defaultMessage: 'Database',
          }
        ),
        value: '',
      },
      collection: {
        label: i18n.translate(
          'xpack.enterpriseSearch.nativeConnectors.mongodb.configuration.collectionLabel',
          {
            defaultMessage: 'Collection',
          }
        ),
        value: '',
      },
      direct_connection: {
        label: i18n.translate(
          'xpack.enterpriseSearch.nativeConnectors.mongodb.configuration.directConnectionLabel',
          {
            defaultMessage: 'Direct connection (true/false)',
          }
        ),
        value: '',
      },
    },
    features: {
      [FeatureName.FILTERING_ADVANCED_CONFIG]: true,
      [FeatureName.FILTERING_RULES]: true,
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
        value: '',
      },
      port: {
        label: i18n.translate(
          'xpack.enterpriseSearch.nativeConnectors.mysql.configuration.portLabel',
          {
            defaultMessage: 'Port',
          }
        ),
        value: '',
      },
      user: {
        label: i18n.translate(
          'xpack.enterpriseSearch.nativeConnectors.mysql.configuration.usernameLabel',
          {
            defaultMessage: 'Username',
          }
        ),
        value: '',
      },
      password: {
        value: '',
        label: i18n.translate(
          'xpack.enterpriseSearch.nativeConnectors.mysql.configuration.passwordLabel',
          {
            defaultMessage: 'Password',
          }
        ),
      },
      database: {
        label: i18n.translate(
          'xpack.enterpriseSearch.nativeConnectors.mysql.configuration.databasesLabel',
          {
            defaultMessage: 'Databases',
          }
        ),
        value: '',
      },
    },
    features: {},
    name: i18n.translate('xpack.enterpriseSearch.nativeConnectors.mysql.name', {
      defaultMessage: 'MySQL',
    }),
    serviceType: 'mysql',
  },
};
