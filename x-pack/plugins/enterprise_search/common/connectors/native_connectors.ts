/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

import { DisplayType, FeatureName, FieldType, NativeConnector } from '../types/connectors';

const USERNAME_LABEL = i18n.translate('xpack.enterpriseSearch.nativeConnectors.usernameLabel', {
  defaultMessage: 'Username',
});

const PASSWORD_LABEL = i18n.translate('xpack.enterpriseSearch.nativeConnectors.passwordLabel', {
  defaultMessage: 'Password',
});

const ENABLE_SSL_LABEL = i18n.translate('xpack.enterpriseSearch.nativeConnectors.enableSSL.label', {
  defaultMessage: 'Enable SSL',
});

const SSL_CERTIFICATE_LABEL = i18n.translate(
  'xpack.enterpriseSearch.nativeConnectors.sslCertificate.label',
  {
    defaultMessage: 'SSL certificate',
  }
);

const RETRIES_PER_REQUEST_LABEL = i18n.translate(
  'xpack.enterpriseSearch.nativeConnectors.retriesPerRequest.label',
  {
    defaultMessage: 'Retries per request',
  }
);

const ADVANCED_RULES_IGNORED_LABEL = i18n.translate(
  'xpack.enterpriseSearch.nativeConnectors.advancedRulesIgnored.label',
  {
    defaultMessage: 'This configurable field is ignored when Advanced Sync Rules are used.',
  }
);

const MAX_CONCURRENT_DOWNLOADS_LABEL = i18n.translate(
  'xpack.enterpriseSearch.nativeConnectors.nativeConnectors.maximumConcurrentLabel',
  {
    defaultMessage: 'Maximum concurrent downloads',
  }
);

const DATABASE_LABEL = i18n.translate('xpack.enterpriseSearch.nativeConnectors.databaseLabel', {
  defaultMessage: 'Database',
});

const PORT_LABEL = i18n.translate('xpack.enterpriseSearch.nativeConnectors.portLabel', {
  defaultMessage: 'Port',
});

export const NATIVE_CONNECTOR_DEFINITIONS: Record<string, NativeConnector | undefined> = {
  azure_blob_storage: {
    configuration: {
      account_name: {
        default_value: null,
        depends_on: [],
        display: DisplayType.TEXTBOX,
        label: i18n.translate(
          'xpack.enterpriseSearch.nativeConnectors.azureBlobStorage.accountNameLabel',
          {
            defaultMessage: 'Account name',
          }
        ),
        options: [],
        order: 1,
        required: true,
        sensitive: false,
        tooltip: null,
        type: FieldType.STRING,
        ui_restrictions: [],
        validations: [],
        value: '',
      },
      account_key: {
        default_value: null,
        depends_on: [],
        display: DisplayType.TEXTBOX,
        label: i18n.translate(
          'xpack.enterpriseSearch.nativeConnectors.azureBlobStorage.accountKeyLabel',
          {
            defaultMessage: 'Account key',
          }
        ),
        options: [],
        order: 2,
        required: true,
        sensitive: false,
        tooltip: null,
        type: FieldType.STRING,
        ui_restrictions: [],
        validations: [],
        value: '',
      },
      blob_endpoint: {
        default_value: null,
        depends_on: [],
        display: DisplayType.TEXTBOX,
        label: i18n.translate(
          'xpack.enterpriseSearch.nativeConnectors.azureBlobStorage.blobEndpointLabel',
          {
            defaultMessage: 'Blob endpoint',
          }
        ),
        options: [],
        order: 3,
        placeholder: 'http://127.0.0.1:10000/devstoreaccount',
        required: true,
        sensitive: false,
        tooltip: null,
        type: FieldType.STRING,
        ui_restrictions: [],
        validations: [],
        value: '',
      },
      retry_count: {
        default_value: 3,
        depends_on: [],
        display: DisplayType.NUMERIC,
        label: RETRIES_PER_REQUEST_LABEL,
        options: [],
        order: 4,
        required: false,
        sensitive: false,
        tooltip: null,
        type: FieldType.INTEGER,
        ui_restrictions: ['advanced'],
        validations: [],
        value: 3,
      },
      concurrent_downloads: {
        default_value: 100,
        depends_on: [],
        display: DisplayType.NUMERIC,
        label: MAX_CONCURRENT_DOWNLOADS_LABEL,
        options: [],
        order: 5,
        required: false,
        sensitive: false,
        tooltip: null,
        type: FieldType.INTEGER,
        ui_restrictions: ['advanced'],
        validations: [
          {
            type: 'less_than',
            constraint: 101,
          },
        ],
        value: 100,
      },
    },
    features: {
      [FeatureName.SYNC_RULES]: {
        advanced: { enabled: false },
        basic: { enabled: true },
      },
    },
    name: i18n.translate('xpack.enterpriseSearch.nativeConnectors.azureBlobStorage.name', {
      defaultMessage: 'Azure Blob Storage',
    }),
    serviceType: 'azure_blob_storage',
  },
  confluence: {
    configuration: {
      data_source: {
        default_value: null,
        depends_on: [],
        display: DisplayType.DROPDOWN,
        label: i18n.translate('xpack.enterpriseSearch.nativeConnectors.confluenceSource.label', {
          defaultMessage: 'Confluence data source',
        }),
        options: [
          {
            label: i18n.translate('xpack.enterpriseSearch.nativeConnectors.confluenceCloud.name', {
              defaultMessage: 'Confluence Cloud',
            }),
            value: 'confluence_cloud',
          },
          {
            label: i18n.translate('xpack.enterpriseSearch.nativeConnectors.confluenceServer.name', {
              defaultMessage: 'Confluence Server',
            }),
            value: 'confluence_server',
          },
        ],
        order: 1,
        required: true,
        sensitive: false,
        tooltip: null,
        type: FieldType.STRING,
        ui_restrictions: [],
        validations: [],
        value: 'confluence_server',
      },
      username: {
        default_value: null,
        depends_on: [
          {
            field: 'data_source',
            value: 'confluence_server',
          },
        ],
        display: DisplayType.TEXTBOX,
        label: i18n.translate(
          'xpack.enterpriseSearch.nativeConnectors.confluenceServer.usernameLabel',
          {
            defaultMessage: 'Confluence Server username',
          }
        ),
        options: [],
        order: 2,
        required: true,
        sensitive: false,
        tooltip: null,
        type: FieldType.STRING,
        ui_restrictions: [],
        validations: [],
        value: 'admin',
      },
      password: {
        default_value: null,
        depends_on: [
          {
            field: 'data_source',
            value: 'confluence_server',
          },
        ],
        display: DisplayType.TEXTBOX,
        label: i18n.translate(
          'xpack.enterpriseSearch.nativeConnectors.confluenceServer.passwordLabel',
          {
            defaultMessage: 'Confluence Server password',
          }
        ),
        options: [],
        order: 3,
        required: true,
        sensitive: true,
        tooltip: null,
        type: FieldType.STRING,
        ui_restrictions: [],
        validations: [],
        value: '',
      },
      account_email: {
        default_value: null,
        depends_on: [
          {
            field: 'data_source',
            value: 'confluence_cloud',
          },
        ],
        display: DisplayType.TEXTBOX,
        label: i18n.translate(
          'xpack.enterpriseSearch.nativeConnectors.confluenceCloud.accountEmailLabel',
          {
            defaultMessage: 'Confluence Cloud account email',
          }
        ),
        options: [],
        order: 4,
        placeholder: 'me@example.com',
        required: true,
        sensitive: false,
        tooltip: null,
        type: FieldType.STRING,
        ui_restrictions: [],
        validations: [],
        value: '',
      },
      api_token: {
        default_value: null,
        depends_on: [
          {
            field: 'data_source',
            value: 'confluence_cloud',
          },
        ],
        display: DisplayType.TEXTBOX,
        label: i18n.translate(
          'xpack.enterpriseSearch.nativeConnectors.confluenceServer.apiTokenLabel',
          {
            defaultMessage: 'Confluence Cloud API token',
          }
        ),
        options: [],
        order: 5,
        required: true,
        sensitive: true,
        tooltip: null,
        type: FieldType.STRING,
        ui_restrictions: [],
        validations: [],
        value: '',
      },
      confluence_url: {
        default_value: null,
        depends_on: [],
        display: DisplayType.TEXTBOX,
        label: i18n.translate('xpack.enterpriseSearch.nativeConnectors.confluence.urlLabel', {
          defaultMessage: 'Confluence URL label',
        }),
        options: [],
        order: 6,
        placeholder: 'http://127.0.0.1:5000',
        required: true,
        sensitive: false,
        tooltip: null,
        type: FieldType.STRING,
        ui_restrictions: [],
        validations: [],
        value: '',
      },
      spaces: {
        default_value: null,
        depends_on: [],
        display: DisplayType.TEXTAREA,
        label: i18n.translate('xpack.enterpriseSearch.nativeConnectors.confluence.spaceKeysLabel', {
          defaultMessage: 'Confluence space keys',
        }),
        options: [],
        order: 7,
        required: true,
        sensitive: false,
        tooltip: ADVANCED_RULES_IGNORED_LABEL,
        type: FieldType.LIST,
        ui_restrictions: [],
        validations: [],
        value: '*',
      },
      ssl_enabled: {
        default_value: null,
        depends_on: [],
        display: DisplayType.TOGGLE,
        label: ENABLE_SSL_LABEL,
        options: [],
        order: 8,
        required: true,
        sensitive: false,
        tooltip: null,
        type: FieldType.BOOLEAN,
        ui_restrictions: [],
        validations: [],
        value: false,
      },
      ssl_ca: {
        default_value: null,
        depends_on: [
          {
            field: 'ssl_enabled',
            value: true,
          },
        ],
        display: DisplayType.TEXTBOX,
        label: SSL_CERTIFICATE_LABEL,
        options: [],
        order: 9,
        required: true,
        sensitive: false,
        tooltip: null,
        type: FieldType.STRING,
        ui_restrictions: [],
        validations: [],
        value: '',
      },
      retry_count: {
        default_value: 3,
        depends_on: [],
        display: DisplayType.NUMERIC,
        label: RETRIES_PER_REQUEST_LABEL,
        options: [],
        order: 10,
        required: false,
        sensitive: false,
        tooltip: null,
        type: FieldType.STRING,
        ui_restrictions: ['advanced'],
        validations: [],
        value: 3,
      },
      concurrent_downloads: {
        default_value: 50,
        depends_on: [],
        display: DisplayType.NUMERIC,
        label: MAX_CONCURRENT_DOWNLOADS_LABEL,
        options: [],
        order: 11,
        required: false,
        sensitive: false,
        tooltip: null,
        type: FieldType.INTEGER,
        ui_restrictions: ['advanced'],
        validations: [
          {
            constraint: 51,
            type: 'less_than',
          },
        ],
        value: 50,
      },
    },
    features: {
      [FeatureName.SYNC_RULES]: {
        advanced: { enabled: true },
        basic: { enabled: true },
      },
    },
    name: i18n.translate('xpack.enterpriseSearch.nativeConnectors.confluence.name', {
      defaultMessage: 'Confluence',
    }),
    serviceType: 'confluence',
  },
  jira: {
    configuration: {
      data_source: {
        default_value: null,
        depends_on: [],
        display: DisplayType.DROPDOWN,
        label: i18n.translate('xpack.enterpriseSearch.nativeConnectors.jira.dataSourceLabel', {
          defaultMessage: 'Jira data source',
        }),
        options: [
          {
            label: i18n.translate('xpack.enterpriseSearch.nativeConnectors.jira.jiraCloudLabel', {
              defaultMessage: 'Jira Cloud',
            }),
            value: 'jira_cloud',
          },
          {
            label: i18n.translate('xpack.enterpriseSearch.nativeConnectors.jira.jiraServerLabel', {
              defaultMessage: 'Jira Server',
            }),
            value: 'jira_server',
          },
        ],
        order: 1,
        required: true,
        sensitive: false,
        tooltip: null,
        type: FieldType.STRING,
        ui_restrictions: [],
        validations: [],
        value: 'jira_cloud',
      },
      username: {
        default_value: null,
        depends_on: [
          {
            field: 'data_source',
            value: 'jira_server',
          },
        ],
        display: DisplayType.TEXTBOX,
        label: i18n.translate('xpack.enterpriseSearch.nativeConnectors.jira.serverUsername', {
          defaultMessage: 'Jira Server username',
        }),
        options: [],
        order: 2,
        required: true,
        sensitive: false,
        tooltip: null,
        type: FieldType.STRING,
        ui_restrictions: [],
        validations: [],
        value: 'admin',
      },
      password: {
        default_value: null,
        depends_on: [
          {
            field: 'data_source',
            value: 'jira_server',
          },
        ],
        display: DisplayType.TEXTBOX,
        label: i18n.translate('xpack.enterpriseSearch.nativeConnectors.jira.serverPasswordLabel', {
          defaultMessage: 'Jira Server password',
        }),
        options: [],
        order: 3,
        required: true,
        sensitive: true,
        tooltip: null,
        type: FieldType.STRING,
        ui_restrictions: [],
        validations: [],
        value: 'changeme',
      },
      account_email: {
        default_value: null,
        depends_on: [
          {
            field: 'data_source',
            value: 'jira_cloud',
          },
        ],
        display: DisplayType.TEXTBOX,
        label: i18n.translate(
          'xpack.enterpriseSearch.nativeConnectors.jira.cloudServiceAccountLabel',
          {
            defaultMessage: 'Jira Cloud service account id',
          }
        ),
        options: [],
        order: 4,
        placeholder: 'me@example.com',
        required: true,
        sensitive: false,
        tooltip: null,
        type: FieldType.STRING,
        ui_restrictions: [],
        validations: [],
        value: '',
      },
      api_token: {
        default_value: null,
        depends_on: [
          {
            field: 'data_source',
            value: 'jira_cloud',
          },
        ],
        display: DisplayType.TEXTBOX,
        label: i18n.translate('xpack.enterpriseSearch.nativeConnectors.jira.cloudApiTokenLabel', {
          defaultMessage: 'Jira Cloud API token',
        }),
        options: [],
        order: 5,
        required: true,
        sensitive: true,
        tooltip: null,
        type: FieldType.STRING,
        ui_restrictions: [],
        validations: [],
        value: 'abc#123',
      },
      jira_url: {
        default_value: null,
        depends_on: [],
        display: DisplayType.TEXTBOX,
        label: i18n.translate('xpack.enterpriseSearch.nativeConnectors.jira.hostUrlLabel', {
          defaultMessage: 'Jira host url',
        }),
        options: [],
        order: 6,
        placeholder: 'http://127.0.0.1:8080',
        required: true,
        sensitive: false,
        tooltip: null,
        type: FieldType.STRING,
        ui_restrictions: [],
        validations: [],
        value: '',
      },
      projects: {
        default_value: null,
        depends_on: [],
        display: DisplayType.TEXTAREA,
        label: i18n.translate('xpack.enterpriseSearch.nativeConnectors.jira.projectKeysLabel', {
          defaultMessage: 'Jira project keys',
        }),
        options: [],
        order: 7,
        required: true,
        sensitive: false,
        tooltip: ADVANCED_RULES_IGNORED_LABEL,
        type: FieldType.LIST,
        ui_restrictions: [],
        validations: [],
        value: '*',
      },
      ssl_enabled: {
        default_value: null,
        depends_on: [],
        display: DisplayType.TOGGLE,
        label: ENABLE_SSL_LABEL,
        options: [],
        order: 8,
        required: true,
        sensitive: false,
        tooltip: null,
        type: FieldType.BOOLEAN,
        ui_restrictions: [],
        validations: [],
        value: false,
      },
      ssl_ca: {
        default_value: null,
        depends_on: [
          {
            field: 'ssl_enabled',
            value: true,
          },
        ],
        display: DisplayType.TEXTBOX,
        label: SSL_CERTIFICATE_LABEL,
        options: [],
        order: 9,
        required: true,
        sensitive: false,
        tooltip: null,
        type: FieldType.STRING,
        ui_restrictions: [],
        validations: [],
        value: '',
      },
      retry_count: {
        default_value: 3,
        depends_on: [],
        display: DisplayType.NUMERIC,
        label: RETRIES_PER_REQUEST_LABEL,
        options: [],
        order: 10,
        required: false,
        sensitive: false,
        tooltip: null,
        type: FieldType.INTEGER,
        ui_restrictions: ['advanced'],
        validations: [],
        value: 3,
      },
      concurrent_downloads: {
        default_value: 100,
        depends_on: [],
        display: DisplayType.NUMERIC,
        label: MAX_CONCURRENT_DOWNLOADS_LABEL,
        options: [],
        order: 11,
        required: false,
        sensitive: false,
        tooltip: null,
        type: FieldType.INTEGER,
        ui_restrictions: ['advanced'],
        validations: [
          {
            type: 'less_than',
            constraint: 101,
          },
        ],
        value: 100,
      },
    },
    features: {
      [FeatureName.SYNC_RULES]: {
        advanced: { enabled: true },
        basic: { enabled: true },
      },
    },
    name: i18n.translate('xpack.enterpriseSearch.nativeConnectors.jira.name', {
      defaultMessage: 'Jira',
    }),
    serviceType: 'jira',
  },
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
        type: FieldType.STRING,
        ui_restrictions: [],
        validations: [],
        value: '',
      },
      user: {
        default_value: '',
        depends_on: [],
        display: DisplayType.TEXTBOX,
        label: USERNAME_LABEL,
        options: [],
        order: 2,
        required: false,
        sensitive: false,
        tooltip: '',
        type: FieldType.STRING,
        ui_restrictions: [],
        validations: [],
        value: '',
      },
      password: {
        default_value: '',
        depends_on: [],
        display: DisplayType.TEXTBOX,
        label: PASSWORD_LABEL,
        options: [],
        order: 3,
        required: false,
        sensitive: true,
        tooltip: '',
        type: FieldType.STRING,
        ui_restrictions: [],
        validations: [],
        value: '',
      },
      database: {
        default_value: '',
        depends_on: [],
        display: DisplayType.TEXTBOX,
        label: DATABASE_LABEL,
        options: [],
        order: 4,
        required: true,
        sensitive: false,
        tooltip: '',
        type: FieldType.STRING,
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
        type: FieldType.STRING,
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
        type: FieldType.BOOLEAN,
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
  mssql: {
    configuration: {
      host: {
        default_value: '',
        depends_on: [],
        display: DisplayType.TEXTBOX,
        label: i18n.translate(
          'xpack.enterpriseSearch.nativeConnectors.mssql.configuration.hostLabel',
          {
            defaultMessage: 'Host',
          }
        ),
        options: [],
        order: 1,
        required: true,
        sensitive: false,
        tooltip: '',
        type: FieldType.STRING,
        ui_restrictions: [],
        validations: [],
        value: '',
      },
      port: {
        default_value: null,
        depends_on: [],
        display: DisplayType.NUMERIC,
        label: PORT_LABEL,
        options: [],
        order: 2,
        required: true,
        sensitive: false,
        tooltip: '',
        type: FieldType.INTEGER,
        ui_restrictions: [],
        validations: [],
        value: 9090,
      },
      username: {
        default_value: '',
        depends_on: [],
        display: DisplayType.TEXTBOX,
        label: i18n.translate(
          'xpack.enterpriseSearch.nativeConnectors.mssql.configuration.usernameLabel',
          {
            defaultMessage: 'Username',
          }
        ),
        options: [],
        order: 3,
        required: true,
        sensitive: false,
        tooltip: '',
        type: FieldType.STRING,
        ui_restrictions: [],
        validations: [],
        value: '',
      },
      password: {
        default_value: '',
        depends_on: [],
        display: DisplayType.TEXTBOX,
        label: i18n.translate(
          'xpack.enterpriseSearch.nativeConnectors.mssql.configuration.passwordLabel',
          {
            defaultMessage: 'Password',
          }
        ),
        options: [],
        order: 4,
        required: true,
        sensitive: true,
        tooltip: '',
        type: FieldType.STRING,
        ui_restrictions: [],
        validations: [],
        value: '',
      },
      database: {
        default_value: '',
        depends_on: [],
        display: DisplayType.TEXTBOX,
        label: DATABASE_LABEL,
        options: [],
        order: 5,
        required: true,
        sensitive: false,
        tooltip: '',
        type: FieldType.STRING,
        ui_restrictions: [],
        validations: [],
        value: '',
      },
      tables: {
        default_value: '',
        depends_on: [],
        display: DisplayType.TEXTAREA,
        label: i18n.translate(
          'xpack.enterpriseSearch.nativeConnectors.mssql.configuration.tablesLabel',
          {
            defaultMessage: 'Comma-separated list of tables',
          }
        ),
        options: [],
        order: 6,
        required: true,
        sensitive: false,
        tooltip: '',
        type: FieldType.LIST,
        ui_restrictions: [],
        validations: [],
        value: '*',
      },
      ssl_enabled: {
        default_value: false,
        depends_on: [],
        display: DisplayType.TOGGLE,
        label: ENABLE_SSL_LABEL,
        options: [],
        order: 10,
        required: true,
        sensitive: false,
        tooltip: '',
        type: FieldType.BOOLEAN,
        ui_restrictions: [],
        validations: [],
        value: false,
      },
      ssl_ca: {
        default_value: '',
        depends_on: [{ field: 'ssl_enabled', value: true }],
        display: DisplayType.TEXTBOX,
        label: SSL_CERTIFICATE_LABEL,
        options: [],
        order: 11,
        required: true,
        sensitive: false,
        tooltip: '',
        type: FieldType.STRING,
        ui_restrictions: [],
        validations: [],
        value: '',
      },
      schema: {
        default_value: '',
        depends_on: [],
        display: DisplayType.TEXTBOX,
        label: i18n.translate(
          'xpack.enterpriseSearch.nativeConnectors.mssql.configuration.schemaLabel',
          {
            defaultMessage: 'Schema',
          }
        ),
        options: [],
        order: 9,
        required: true,
        sensitive: false,
        tooltip: '',
        type: FieldType.STRING,
        ui_restrictions: [],
        validations: [],
        value: 'dbo',
      },
      fetch_size: {
        default_value: 50,
        depends_on: [],
        display: DisplayType.NUMERIC,
        label: i18n.translate(
          'xpack.enterpriseSearch.nativeConnectors.mssql.configuration.rowsFetchedLabel',
          {
            defaultMessage: 'Rows fetched per request',
          }
        ),
        options: [],
        order: 7,
        required: false,
        sensitive: false,
        tooltip: '',
        type: FieldType.INTEGER,
        ui_restrictions: ['advanced'],
        validations: [],
        value: 50,
      },
      retry_count: {
        default_value: 3,
        depends_on: [],
        display: DisplayType.NUMERIC,
        label: i18n.translate(
          'xpack.enterpriseSearch.nativeConnectors.mssql.configuration.retriesLabel',
          {
            defaultMessage: 'Retries per request',
          }
        ),
        options: [],
        order: 8,
        required: false,
        sensitive: false,
        tooltip: '',
        type: FieldType.INTEGER,
        ui_restrictions: ['advanced'],
        validations: [],
        value: 3,
      },
      validate_host: {
        default_value: false,
        depends_on: [],
        display: DisplayType.TOGGLE,
        label: i18n.translate(
          'xpack.enterpriseSearch.nativeConnectors.mssql.configuration.validateHostLabel',
          {
            defaultMessage: 'Validate host',
          }
        ),
        options: [],
        order: 12,
        required: true,
        sensitive: false,
        tooltip: '',
        type: FieldType.BOOLEAN,
        ui_restrictions: [],
        validations: [],
        value: false,
      },
    },
    features: {
      [FeatureName.SYNC_RULES]: {
        advanced: { enabled: false },
        basic: { enabled: true },
      },
    },
    name: i18n.translate('xpack.enterpriseSearch.nativeConnectors.mssql.name', {
      defaultMessage: 'Microsoft SQL',
    }),
    serviceType: 'mssql',
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
        type: FieldType.STRING,
        ui_restrictions: [],
        validations: [],
        value: '',
      },
      port: {
        default_value: null,
        depends_on: [],
        display: DisplayType.NUMERIC,
        label: PORT_LABEL,
        options: [],
        order: 2,
        required: true,
        sensitive: false,
        tooltip: '',
        type: FieldType.INTEGER,
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
        type: FieldType.STRING,
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
        type: FieldType.STRING,
        ui_restrictions: [],
        validations: [],
        value: '',
      },
      database: {
        default_value: '',
        depends_on: [],
        display: DisplayType.TEXTBOX,
        label: DATABASE_LABEL,
        options: [],
        order: 5,
        required: true,
        sensitive: false,
        tooltip: '',
        type: FieldType.STRING,
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
        type: FieldType.LIST,
        ui_restrictions: [],
        validations: [],
        value: '',
      },
      ssl_enabled: {
        default_value: false,
        depends_on: [],
        display: DisplayType.TOGGLE,
        label: ENABLE_SSL_LABEL,
        options: [],
        order: 7,
        required: true,
        sensitive: false,
        tooltip: '',
        type: FieldType.BOOLEAN,
        ui_restrictions: [],
        validations: [],
        value: false,
      },
      ssl_ca: {
        default_value: '',
        depends_on: [{ field: 'ssl_enabled', value: true }],
        display: DisplayType.TEXTBOX,
        label: SSL_CERTIFICATE_LABEL,
        options: [],
        order: 8,
        required: true,
        sensitive: false,
        tooltip: '',
        type: FieldType.STRING,
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
        type: FieldType.INTEGER,
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
        type: FieldType.INTEGER,
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
  network_drive: {
    configuration: {
      username: {
        default_value: null,
        depends_on: [],
        display: DisplayType.TEXTBOX,
        label: USERNAME_LABEL,
        options: [],
        order: 1,
        required: true,
        sensitive: false,
        tooltip: '',
        type: FieldType.STRING,
        ui_restrictions: [],
        validations: [],
        value: '',
      },
      password: {
        default_value: null,
        depends_on: [],
        display: DisplayType.TEXTBOX,
        label: PASSWORD_LABEL,
        options: [],
        order: 2,
        required: true,
        sensitive: true,
        tooltip: '',
        type: FieldType.STRING,
        ui_restrictions: [],
        validations: [],
        value: '',
      },
      server_ip: {
        default_value: null,
        depends_on: [],
        display: DisplayType.TEXTBOX,
        label: i18n.translate(
          'xpack.enterpriseSearch.nativeConnectors.networkDrive.ipAddressLabel',
          {
            defaultMessage: 'IP address',
          }
        ),
        options: [],
        order: 3,
        placeholder: '127.0.0.1',
        required: true,
        sensitive: false,
        tooltip: '',
        type: FieldType.STRING,
        ui_restrictions: [],
        validations: [],
        value: '',
      },
      server_port: {
        default_value: null,
        depends_on: [],
        display: DisplayType.NUMERIC,
        label: PORT_LABEL,
        options: [],
        order: 4,
        required: true,
        sensitive: false,
        tooltip: '',
        type: FieldType.INTEGER,
        ui_restrictions: [],
        validations: [],
        value: 445,
      },
      drive_path: {
        default_value: null,
        depends_on: [],
        display: DisplayType.TEXTBOX,
        label: i18n.translate('xpack.enterpriseSearch.nativeConnectors.networkDrive.pathLabel', {
          defaultMessage: 'Path',
        }),
        options: [],
        order: 5,
        placeholder: 'Folder1',
        required: true,
        sensitive: false,
        tooltip: '',
        type: FieldType.STRING,
        ui_restrictions: [],
        validations: [],
        value: '',
      },
    },
    features: {
      [FeatureName.SYNC_RULES]: {
        advanced: { enabled: false },
        basic: { enabled: true },
      },
    },
    name: i18n.translate('xpack.enterpriseSearch.nativeConnectors.networkDrive.name', {
      defaultMessage: 'Network drive',
    }),
    serviceType: 'network_drive',
  },
  postgresql: {
    configuration: {
      host: {
        default_value: '',
        depends_on: [],
        display: DisplayType.TEXTBOX,
        label: i18n.translate(
          'xpack.enterpriseSearch.nativeConnectors.postgresql.configuration.hostLabel',
          {
            defaultMessage: 'Host',
          }
        ),
        options: [],
        order: 1,
        required: true,
        sensitive: false,
        tooltip: '',
        type: FieldType.STRING,
        ui_restrictions: [],
        validations: [],
        value: '',
      },
      port: {
        default_value: null,
        depends_on: [],
        display: DisplayType.NUMERIC,
        label: PORT_LABEL,
        options: [],
        order: 2,
        required: true,
        sensitive: false,
        tooltip: '',
        type: FieldType.INTEGER,
        ui_restrictions: [],
        validations: [],
        value: 9090,
      },
      username: {
        default_value: '',
        depends_on: [],
        display: DisplayType.TEXTBOX,
        label: USERNAME_LABEL,
        options: [],
        order: 3,
        required: true,
        sensitive: false,
        tooltip: '',
        type: FieldType.STRING,
        ui_restrictions: [],
        validations: [],
        value: '',
      },
      password: {
        default_value: '',
        depends_on: [],
        display: DisplayType.TEXTBOX,
        label: PASSWORD_LABEL,
        options: [],
        order: 4,
        required: true,
        sensitive: true,
        tooltip: '',
        type: FieldType.STRING,
        ui_restrictions: [],
        validations: [],
        value: '',
      },
      database: {
        default_value: '',
        depends_on: [],
        display: DisplayType.TEXTBOX,
        label: DATABASE_LABEL,
        options: [],
        order: 5,
        required: true,
        sensitive: false,
        tooltip: '',
        type: FieldType.STRING,
        ui_restrictions: [],
        validations: [],
        value: '',
      },
      tables: {
        default_value: '',
        depends_on: [],
        display: DisplayType.TEXTAREA,
        label: i18n.translate(
          'xpack.enterpriseSearch.nativeConnectors.postgresql.configuration.tablesLabel',
          {
            defaultMessage: 'Comma-separated list of tables',
          }
        ),
        options: [],
        order: 6,
        required: true,
        sensitive: false,
        tooltip: '',
        type: FieldType.LIST,
        ui_restrictions: [],
        validations: [],
        value: '*',
      },
      ssl_enabled: {
        default_value: false,
        depends_on: [],
        display: DisplayType.TOGGLE,
        label: ENABLE_SSL_LABEL,
        options: [],
        order: 9,
        required: true,
        sensitive: false,
        tooltip: '',
        type: FieldType.BOOLEAN,
        ui_restrictions: [],
        validations: [],
        value: false,
      },
      ssl_ca: {
        default_value: '',
        depends_on: [{ field: 'ssl_enabled', value: true }],
        display: DisplayType.TEXTBOX,
        label: SSL_CERTIFICATE_LABEL,
        options: [],
        order: 10,
        required: true,
        sensitive: false,
        tooltip: '',
        type: FieldType.STRING,
        ui_restrictions: [],
        validations: [],
        value: '',
      },
      fetch_size: {
        default_value: 50,
        depends_on: [],
        display: DisplayType.NUMERIC,
        label: i18n.translate(
          'xpack.enterpriseSearch.nativeConnectors.postgresql.configuration.rowsFetchedLabel',
          {
            defaultMessage: 'Rows fetched per request',
          }
        ),
        options: [],
        order: 7,
        required: false,
        sensitive: false,
        tooltip: '',
        type: FieldType.INTEGER,
        ui_restrictions: ['advanced'],
        validations: [],
        value: 50,
      },
      retry_count: {
        default_value: 3,
        depends_on: [],
        display: DisplayType.NUMERIC,
        label: i18n.translate(
          'xpack.enterpriseSearch.nativeConnectors.postgresql.configuration.retriesLabel',
          {
            defaultMessage: 'Retries per request',
          }
        ),
        options: [],
        order: 8,
        required: false,
        sensitive: false,
        tooltip: '',
        type: FieldType.INTEGER,
        ui_restrictions: ['advanced'],
        validations: [],
        value: 3,
      },
    },
    features: {
      [FeatureName.SYNC_RULES]: {
        advanced: { enabled: false },
        basic: { enabled: true },
      },
    },
    name: i18n.translate('xpack.enterpriseSearch.nativeConnectors.postgresql.name', {
      defaultMessage: 'PostgreSQL',
    }),
    serviceType: 'postgresql',
  },
  sharepoint_online: {
    configuration: {
      tenant_id: {
        default_value: null,
        depends_on: [],
        display: DisplayType.TEXTBOX,
        label: i18n.translate(
          'xpack.enterpriseSearch.nativeConnectors.sharepoint_online.configuration.tenantIdLabel',
          {
            defaultMessage: 'Tenant ID',
          }
        ),
        options: [],
        order: 1,
        required: true,
        sensitive: false,
        tooltip: '',
        type: FieldType.STRING,
        ui_restrictions: [],
        validations: [],
        value: '',
      },
      tenant_name: {
        default_value: null,
        depends_on: [],
        display: DisplayType.TEXTBOX,
        label: i18n.translate(
          'xpack.enterpriseSearch.nativeConnectors.sharepoint_online.configuration.tenantNameLabel',
          {
            defaultMessage: 'Tenant name',
          }
        ),
        options: [],
        order: 2,
        required: true,
        sensitive: false,
        tooltip: '',
        type: FieldType.STRING,
        ui_restrictions: [],
        validations: [],
        value: '',
      },
      client_id: {
        default_value: null,
        depends_on: [],
        display: DisplayType.TEXTBOX,
        label: i18n.translate(
          'xpack.enterpriseSearch.nativeConnectors.sharepoint_online.configuration.clientIdLabel',
          {
            defaultMessage: 'Client ID',
          }
        ),
        options: [],
        order: 3,
        required: true,
        sensitive: false,
        tooltip: '',
        type: FieldType.STRING,
        ui_restrictions: [],
        validations: [],
        value: '',
      },
      secret_value: {
        default_value: null,
        depends_on: [],
        display: DisplayType.TEXTBOX,
        label: i18n.translate(
          'xpack.enterpriseSearch.nativeConnectors.sharepoint_online.configuration.secretValueLabel',
          {
            defaultMessage: 'Secret value',
          }
        ),
        options: [],
        order: 4,
        required: true,
        sensitive: true,
        tooltip: '',
        type: FieldType.STRING,
        ui_restrictions: [],
        validations: [],
        value: '',
      },
      site_collections: {
        default_value: null,
        depends_on: [],
        display: DisplayType.TEXTAREA,
        label: i18n.translate(
          'xpack.enterpriseSearch.nativeConnectors.sharepoint_online.configuration.siteCollectionsLabel',
          {
            defaultMessage: 'Comma-separated list of sites',
          }
        ),
        options: [],
        order: 5,
        required: true,
        sensitive: false,
        tooltip: i18n.translate(
          'xpack.enterpriseSearch.nativeConnectors.sharepoint_online.configuration.siteCollectionsTooltip',
          {
            defaultMessage:
              'A comma-separated list of sites to ingest data from. ' +
              'Use * to include all available sites.',
          }
        ),
        type: FieldType.LIST,
        ui_restrictions: [],
        validations: [],
        value: '',
      },
      use_text_extraction_service: {
        default_value: false,
        depends_on: [],
        display: DisplayType.TOGGLE,
        label: i18n.translate(
          'xpack.enterpriseSearch.nativeConnectors.sharepoint_online.configuration.textExtractionServiceLabel',
          {
            defaultMessage: 'Use text extraction service',
          }
        ),
        options: [],
        order: 6,
        required: true,
        sensitive: false,
        tooltip: i18n.translate(
          'xpack.enterpriseSearch.nativeConnectors.sharepoint_online.configuration.textExtractionServiceTooltip',
          {
            defaultMessage:
              'Requires a separate deployment of the Elastic Data Extraction Service. ' +
              'Also requires that pipeline settings disable text extraction.',
          }
        ),
        type: FieldType.BOOLEAN,
        ui_restrictions: ['advanced'],
        validations: [],
        value: false,
      },
      use_document_level_security: {
        default_value: false,
        depends_on: [],
        display: DisplayType.TOGGLE,
        label: i18n.translate(
          'xpack.enterpriseSearch.nativeConnectors.sharepoint_online.configuration.useDocumentLevelSecurityLabel',
          {
            defaultMessage: 'Enable document level security',
          }
        ),
        options: [],
        order: 7,
        required: true,
        sensitive: false,
        tooltip: i18n.translate(
          'xpack.enterpriseSearch.nativeConnectors.sharepoint_online.configuration.useDocumentLevelSecurityTooltip',
          {
            defaultMessage:
              'Document level security ensures identities and permissions set in Sharepoint Online are maintained in Elasticsearch. This metadata is added to your Elasticsearch documents, so you can control user and group read-access. Access control syncs ensure this metadata is kept up to date.',
          }
        ),
        type: FieldType.BOOLEAN,
        ui_restrictions: [],
        validations: [],
        value: false,
      },
    },
    features: {
      [FeatureName.SYNC_RULES]: {
        advanced: { enabled: true },
        basic: { enabled: true },
      },
      [FeatureName.DOCUMENT_LEVEL_SECURITY]: {
        enabled: true,
      },
      [FeatureName.INCREMENTAL_SYNC]: {
        enabled: true,
      },
    },
    name: i18n.translate('xpack.enterpriseSearch.nativeConnectors.sharepoint_online.name', {
      defaultMessage: 'Sharepoint Online',
    }),
    serviceType: 'sharepoint_online',
  },
};
