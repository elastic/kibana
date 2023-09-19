/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { HttpServiceSetup } from '@kbn/core/server';

import type { IntegrationCategory } from '@kbn/custom-integrations-plugin/common';
import type { CustomIntegrationsPluginSetup } from '@kbn/custom-integrations-plugin/server';
import { i18n } from '@kbn/i18n';

import { ConfigType } from '.';

interface WorkplaceSearchIntegration {
  id: string;
  title: string;
  description: string;
  categories: IntegrationCategory[];
  uiInternalPath?: string;
}

const workplaceSearchIntegrations: WorkplaceSearchIntegration[] = [
  {
    id: 'box',
    title: i18n.translate('xpack.enterpriseSearch.workplaceSearch.integrations.boxName', {
      defaultMessage: 'Box',
    }),
    description: i18n.translate(
      'xpack.enterpriseSearch.workplaceSearch.integrations.boxDescription',
      {
        defaultMessage: 'Search over your files and folders stored on Box with Workplace Search.',
      }
    ),
    categories: ['enterprise_search', 'workplace_search_content_source'],
  },
  {
    id: 'zendesk',
    title: i18n.translate('xpack.enterpriseSearch.workplaceSearch.integrations.zendeskName', {
      defaultMessage: 'Zendesk',
    }),
    description: i18n.translate(
      'xpack.enterpriseSearch.workplaceSearch.integrations.zendeskDescription',
      {
        defaultMessage: 'Search over your tickets on Zendesk with Workplace Search.',
      }
    ),
    categories: ['enterprise_search', 'workplace_search_content_source'],
  },
];

export const registerEnterpriseSearchIntegrations = (
  config: ConfigType,
  http: HttpServiceSetup,
  customIntegrations: CustomIntegrationsPluginSetup,
  isCloud: boolean
) => {
  const nativeSearchTag = config.hasNativeConnectors && isCloud ? ['native_search'] : [];
  if (config.canDeployEntSearch) {
    workplaceSearchIntegrations.forEach((integration) => {
      customIntegrations.registerCustomIntegration({
        uiInternalPath: `/app/enterprise_search/workplace_search/sources/add/${integration.id}`,
        icons: [
          {
            type: 'svg',
            src: http.basePath.prepend(
              `/plugins/enterpriseSearch/assets/source_icons/${integration.id}.svg`
            ),
          },
        ],
        isBeta: false,
        shipper: 'enterprise_search',
        ...integration,
      });
    });

    customIntegrations.registerCustomIntegration({
      id: 'app_search_json',
      title: i18n.translate('xpack.enterpriseSearch.appSearch.integrations.jsonName', {
        defaultMessage: 'JSON',
      }),
      description: i18n.translate('xpack.enterpriseSearch.appSearch.integrations.jsonDescription', {
        defaultMessage: 'Search over your JSON data with App Search.',
      }),
      categories: ['enterprise_search', 'custom', 'app_search'],
      uiInternalPath: '/app/enterprise_search/app_search/engines/new?method=json',
      icons: [
        {
          type: 'eui',
          src: 'logoAppSearch',
        },
      ],
      shipper: 'enterprise_search',
      isBeta: false,
    });
  }

  if (config.hasWebCrawler) {
    customIntegrations.registerCustomIntegration({
      id: 'web_crawler',
      title: i18n.translate('xpack.enterpriseSearch.integrations.webCrawlerName', {
        defaultMessage: 'Web crawler',
      }),
      description: i18n.translate('xpack.enterpriseSearch.integrations.webCrawlerDescription', {
        defaultMessage: 'Add search to your website with the web crawler.',
      }),
      categories: ['enterprise_search', 'app_search', 'web', 'elastic_stack', 'crawler'],
      uiInternalPath: '/app/enterprise_search/content/search_indices/new_index/crawler',
      icons: [
        {
          type: 'eui',
          src: 'logoEnterpriseSearch',
        },
      ],
      shipper: 'enterprise_search',
      isBeta: false,
    });
  }

  customIntegrations.registerCustomIntegration({
    id: 'api',
    title: i18n.translate('xpack.enterpriseSearch.integrations.apiName', {
      defaultMessage: 'API',
    }),
    description: i18n.translate('xpack.enterpriseSearch.integrations.apiDescription', {
      defaultMessage: "Add search to your application with Elasticsearch's robust APIs.",
    }),
    categories: ['enterprise_search', 'custom', 'elastic_stack', 'sdk_search', 'language_client'],
    uiInternalPath: '/app/enterprise_search/content/search_indices/new_index/api',
    icons: [
      {
        type: 'eui',
        src: 'logoEnterpriseSearch',
      },
    ],
    shipper: 'enterprise_search',
    isBeta: false,
  });

  if (config.hasConnectors) {
    customIntegrations.registerCustomIntegration({
      id: 'dropbox',
      title: i18n.translate('xpack.enterpriseSearch.content.integrations.dropbox', {
        defaultMessage: 'Dropbox',
      }),
      description: i18n.translate(
        'xpack.enterpriseSearch.content.integrations.dropboxDescription',
        {
          defaultMessage: 'Search over your files and folders stored on Dropbox.',
        }
      ),
      categories: [
        'enterprise_search',
        'elastic_stack',
        'datastore',
        'connector',
        'connector_client',
        ...nativeSearchTag,
      ],
      uiInternalPath:
        '/app/enterprise_search/content/search_indices/new_index/connector?service_type=dropbox',
      icons: [
        {
          type: 'svg',
          src: http.basePath.prepend('/plugins/enterpriseSearch/assets/source_icons/dropbox.svg'),
        },
      ],
      shipper: 'enterprise_search',
      isBeta: false,
    });

    customIntegrations.registerCustomIntegration({
      id: 'dropbox_paper',
      title: i18n.translate('xpack.enterpriseSearch.content.integrations.dropboxPaper', {
        defaultMessage: 'Dropbox Paper',
      }),
      description: i18n.translate(
        'xpack.enterpriseSearch.content.integrations.dropboxPaperDescription',
        {
          defaultMessage: 'Search over your files and folders stored on Dropbox Paper.',
        }
      ),
      categories: [
        'enterprise_search',
        'elastic_stack',
        'datastore',
        'connector',
        'connector_client',
        ...nativeSearchTag,
      ],
      uiInternalPath:
        '/app/enterprise_search/content/search_indices/new_index/connector?service_type=dropbox',
      icons: [
        {
          type: 'svg',
          src: http.basePath.prepend('/plugins/enterpriseSearch/assets/source_icons/dropbox.svg'),
        },
      ],
      shipper: 'enterprise_search',
      isBeta: false,
    });

    customIntegrations.registerCustomIntegration({
      id: 'github',
      title: i18n.translate('xpack.enterpriseSearch.content.integrations.github', {
        defaultMessage: 'GitHub',
      }),
      description: i18n.translate('xpack.enterpriseSearch.content.integrations.githubDescription', {
        defaultMessage: 'Search over your projects and repos on GitHub.',
      }),
      categories: ['enterprise_search', 'elastic_stack', 'connector', 'connector_client'],
      uiInternalPath:
        '/app/enterprise_search/content/search_indices/new_index/connector?service_type=github',
      icons: [
        {
          type: 'svg',
          src: http.basePath.prepend('/plugins/enterpriseSearch/assets/source_icons/github.svg'),
        },
      ],
      shipper: 'enterprise_search',
      isBeta: false,
    });

    customIntegrations.registerCustomIntegration({
      id: 'github_server',
      title: i18n.translate('xpack.enterpriseSearch.content.integrations.githubServer', {
        defaultMessage: 'GitHub Enterprise Server',
      }),
      description: i18n.translate(
        'xpack.enterpriseSearch.content.integrations.githubServerDescription',
        {
          defaultMessage: 'Search over your projects and repos on GitHub.',
        }
      ),
      categories: ['enterprise_search', 'elastic_stack', 'connector', 'connector_client'],
      uiInternalPath:
        '/app/enterprise_search/content/search_indices/new_index/connector?service_type=github',
      icons: [
        {
          type: 'svg',
          src: http.basePath.prepend(
            '/plugins/enterpriseSearch/assets/source_icons/github_enterprise_server.svg'
          ),
        },
      ],
      shipper: 'enterprise_search',
      isBeta: false,
    });

    customIntegrations.registerCustomIntegration({
      id: 'gmail',
      title: i18n.translate('xpack.enterpriseSearch.content.integrations.gmail', {
        defaultMessage: 'Gmail',
      }),
      description: i18n.translate('xpack.enterpriseSearch.content.integrations.gmailDescription', {
        defaultMessage: 'Search over your content on Gmail.',
      }),
      categories: ['enterprise_search', 'elastic_stack', 'connector', 'connector_client'],
      uiInternalPath:
        '/app/enterprise_search/content/search_indices/new_index/connector?service_type=gmail',
      icons: [
        {
          type: 'svg',
          src: http.basePath.prepend('/plugins/enterpriseSearch/assets/source_icons/gmail.svg'),
        },
      ],
      shipper: 'enterprise_search',
      isBeta: false,
    });

    customIntegrations.registerCustomIntegration({
      id: 'mongodb',
      title: i18n.translate('xpack.enterpriseSearch.workplaceSearch.integrations.mongoDBName', {
        defaultMessage: 'MongoDB',
      }),
      description: i18n.translate(
        'xpack.enterpriseSearch.workplaceSearch.integrations.mongoDBDescription',
        {
          defaultMessage: 'Search over your MongoDB content.',
        }
      ),
      categories: [
        'enterprise_search',
        'datastore',
        'elastic_stack',
        ...nativeSearchTag,
        'connector',
        'connector_client',
      ],
      uiInternalPath:
        '/app/enterprise_search/content/search_indices/new_index/connector?service_type=mongodb',
      icons: [
        {
          type: 'svg',
          src: http.basePath.prepend('/plugins/enterpriseSearch/assets/source_icons/mongodb.svg'),
        },
      ],
      shipper: 'enterprise_search',
      isBeta: false,
    });

    customIntegrations.registerCustomIntegration({
      id: 'mysql',
      title: i18n.translate('xpack.enterpriseSearch.workplaceSearch.integrations.mysqlName', {
        defaultMessage: 'MySQL',
      }),
      description: i18n.translate(
        'xpack.enterpriseSearch.workplaceSearch.integrations.mysqlDescription',
        {
          defaultMessage: 'Search over your MySQL content.',
        }
      ),
      categories: [
        'enterprise_search',
        'datastore',
        'elastic_stack',
        ...nativeSearchTag,
        'connector',
        'connector_client',
      ],
      uiInternalPath:
        '/app/enterprise_search/content/search_indices/new_index/connector?service_type=mysql',
      icons: [
        {
          type: 'svg',
          src: http.basePath.prepend('/plugins/enterpriseSearch/assets/source_icons/mysql.svg'),
        },
      ],
      shipper: 'enterprise_search',
      isBeta: false,
    });

    customIntegrations.registerCustomIntegration({
      id: 'onedrive',
      title: i18n.translate('xpack.enterpriseSearch.integrations.oneDriveTitle', {
        defaultMessage: 'OneDrive',
      }),
      description: i18n.translate(
        'xpack.enterpriseSearch.workplaceSearch.integrations.oneDriveDescription',
        {
          defaultMessage: 'Search over your content on OneDrive.',
        }
      ),
      categories: [
        'enterprise_search',
        'elastic_stack',
        'custom',
        'datastore',
        'connector',
        'connector_client',
      ],
      uiInternalPath:
        '/app/enterprise_search/content/search_indices/new_index/connector?service_type=salesforce',
      icons: [
        {
          type: 'svg',
          src: http.basePath.prepend(
            '/plugins/enterpriseSearch/assets/source_icons/salesforce_sandbox.svg'
          ),
        },
      ],
      shipper: 'enterprise_search',
      isBeta: false,
    });

    customIntegrations.registerCustomIntegration({
      id: 'build_a_connector',
      title: i18n.translate('xpack.enterpriseSearch.integrations.buildAConnectorName', {
        defaultMessage: 'Customized connector',
      }),
      description: i18n.translate(
        'xpack.enterpriseSearch.integrations.buildAConnectorDescription',
        {
          defaultMessage: 'Search over data stored on custom data sources.',
        }
      ),
      categories: ['enterprise_search', 'custom', 'elastic_stack', 'connector', 'connector_client'],
      uiInternalPath:
        '/app/enterprise_search/content/search_indices/new_index/connector?service_type=custom',
      icons: [
        {
          type: 'eui',
          src: 'logoEnterpriseSearch',
        },
      ],
      shipper: 'enterprise_search',
      isBeta: false,
    });

    customIntegrations.registerCustomIntegration({
      id: 'postgresql',
      title: i18n.translate('xpack.enterpriseSearch.workplaceSearch.integrations.postgresqlName', {
        defaultMessage: 'PostgreSQL',
      }),
      description: i18n.translate(
        'xpack.enterpriseSearch.workplaceSearch.integrations.postgreSQLDescription',
        {
          defaultMessage: 'Search over your content on PostgreSQL.',
        }
      ),
      categories: [
        'enterprise_search',
        'elastic_stack',
        'custom',
        'datastore',
        'connector',
        'connector_client',
        ...nativeSearchTag,
      ],
      uiInternalPath:
        '/app/enterprise_search/content/search_indices/new_index/connector?service_type=postgresql',
      icons: [
        {
          type: 'svg',
          src: http.basePath.prepend(
            '/plugins/enterpriseSearch/assets/source_icons/postgresql.svg'
          ),
        },
      ],
      shipper: 'enterprise_search',
      isBeta: false,
    });

    customIntegrations.registerCustomIntegration({
      id: 'salesforce_sandbox',
      title: i18n.translate('xpack.enterpriseSearch.integrations.salesforceSandboxTitle', {
        defaultMessage: 'Salesforce Sandbox',
      }),
      description: i18n.translate(
        'xpack.enterpriseSearch.workplaceSearch.integrations.salesforceSandboxDescription',
        {
          defaultMessage: 'Search over your content on Salesforce Sandbox.',
        }
      ),
      categories: [
        'enterprise_search',
        'elastic_stack',
        'custom',
        'datastore',
        'connector',
        'connector_client',
      ],
      uiInternalPath:
        '/app/enterprise_search/content/search_indices/new_index/connector?service_type=salesforce',
      icons: [
        {
          type: 'svg',
          src: http.basePath.prepend(
            '/plugins/enterpriseSearch/assets/source_icons/salesforce_sandbox.svg'
          ),
        },
      ],
      shipper: 'enterprise_search',
      isBeta: false,
    });

    customIntegrations.registerCustomIntegration({
      id: 'servicenow',
      title: i18n.translate('xpack.enterpriseSearch.workplaceSearch.integrations.serviceNowName', {
        defaultMessage: 'ServiceNow',
      }),
      description: i18n.translate(
        'xpack.enterpriseSearch.workplaceSearch.integrations.serviceNowDescription',
        {
          defaultMessage: 'Search over your content on ServiceNow.',
        }
      ),
      categories: [
        'enterprise_search',
        'elastic_stack',
        'connector',
        'connector_client',
        ...nativeSearchTag,
      ],
      uiInternalPath:
        '/app/enterprise_search/content/search_indices/new_index/connector?service_type=service_now',
      icons: [
        {
          type: 'svg',
          src: http.basePath.prepend(
            '/plugins/enterpriseSearch/assets/source_icons/servicenow.svg'
          ),
        },
      ],
      shipper: 'enterprise_search',
      isBeta: false,
    });

    customIntegrations.registerCustomIntegration({
      id: 'salesforce',
      title: i18n.translate('xpack.enterpriseSearch.integrations.salesforceName', {
        defaultMessage: 'Salesforce',
      }),
      description: i18n.translate('xpack.enterpriseSearch.integrations.salesforceDescription', {
        defaultMessage: 'Search over your content on Salesforce.',
      }),
      categories: [
        'enterprise_search',
        'elastic_stack',
        'connector',
        'connector_client',
        ...nativeSearchTag,
      ],
      uiInternalPath:
        '/app/enterprise_search/content/search_indices/new_index/connector?service_type=salesforce',
      icons: [
        {
          type: 'svg',
          src: http.basePath.prepend(
            '/plugins/enterpriseSearch/assets/source_icons/salesforce.svg'
          ),
        },
      ],
      shipper: 'enterprise_search',
      isBeta: false,
    });

    customIntegrations.registerCustomIntegration({
      id: 'sharepoint_online',
      title: i18n.translate(
        'xpack.enterpriseSearch.workplaceSearch.integrations.sharepointOnlineName',
        {
          defaultMessage: 'SharePoint Online',
        }
      ),
      description: i18n.translate(
        'xpack.enterpriseSearch.workplaceSearch.integrations.sharepointOnlineDescription',
        {
          defaultMessage: 'Search over your content on SharePoint Online.',
        }
      ),
      categories: [
        'enterprise_search',
        'elastic_stack',
        'connector',
        'connector_client',
        ...nativeSearchTag,
      ],
      uiInternalPath:
        '/app/enterprise_search/content/search_indices/new_index/connector?service_type=sharepoint_online',
      icons: [
        {
          type: 'svg',
          src: http.basePath.prepend(
            '/plugins/enterpriseSearch/assets/source_icons/sharepoint_online.svg'
          ),
        },
      ],
      shipper: 'enterprise_search',
      isBeta: false,
    });

    customIntegrations.registerCustomIntegration({
      id: 'sharepoint_server',
      title: i18n.translate(
        'xpack.enterpriseSearch.workplaceSearch.integrations.sharepointServerName',
        {
          defaultMessage: 'SharePoint Server',
        }
      ),
      description: i18n.translate(
        'xpack.enterpriseSearch.workplaceSearch.integrations.sharepointServerDescription',
        {
          defaultMessage: 'Search over your content on SharePoint Server.',
        }
      ),
      categories: ['enterprise_search', 'elastic_stack', 'custom', 'connector', 'connector_client'],
      uiInternalPath:
        '/app/enterprise_search/content/search_indices/new_index/connector?service_type=sharepoint_server',
      icons: [
        {
          type: 'svg',
          src: http.basePath.prepend(
            '/plugins/enterpriseSearch/assets/source_icons/sharepoint_server.svg'
          ),
        },
      ],
      shipper: 'enterprise_search',
      isBeta: false,
    });

    customIntegrations.registerCustomIntegration({
      id: 'slack',
      title: i18n.translate('xpack.enterpriseSearch.content.integrations.slack', {
        defaultMessage: 'Slack',
      }),
      description: i18n.translate('xpack.enterpriseSearch.content.integrations.slackDescription', {
        defaultMessage: 'Search over your content on Slack.',
      }),
      categories: ['enterprise_search', 'elastic_stack', 'connector', 'connector_client'],
      uiInternalPath:
        '/app/enterprise_search/content/search_indices/new_index/connector?service_type=slack',
      icons: [
        {
          type: 'svg',
          src: http.basePath.prepend('/plugins/enterpriseSearch/assets/source_icons/slack.svg'),
        },
      ],
      shipper: 'enterprise_search',
      isBeta: false,
    });

    customIntegrations.registerCustomIntegration({
      id: 'oracle',
      title: i18n.translate('xpack.enterpriseSearch.workplaceSearch.integrations.oracleName', {
        defaultMessage: 'Oracle',
      }),
      description: i18n.translate(
        'xpack.enterpriseSearch.workplaceSearch.integrations.oracleDescription',
        {
          defaultMessage: 'Search over your content on Oracle.',
        }
      ),
      categories: [
        'enterprise_search',
        'elastic_stack',
        'custom',
        'datastore',
        'connector',
        'connector_client',
      ],
      uiInternalPath:
        '/app/enterprise_search/content/search_indices/new_index/connector?service_type=oracle',
      icons: [
        {
          type: 'svg',
          src: http.basePath.prepend('/plugins/enterpriseSearch/assets/source_icons/oracle.svg'),
        },
      ],
      shipper: 'enterprise_search',
      isBeta: false,
    });

    customIntegrations.registerCustomIntegration({
      id: 'mssql',
      title: i18n.translate('xpack.enterpriseSearch.workplaceSearch.integrations.msSqlName', {
        defaultMessage: 'Microsoft SQL',
      }),
      description: i18n.translate(
        'xpack.enterpriseSearch.workplaceSearch.integrations.msSqlDescription',
        {
          defaultMessage: 'Search over your content on Microsoft SQL Server.',
        }
      ),
      categories: [
        'enterprise_search',
        'custom',
        'elastic_stack',
        'datastore',
        'connector',
        'connector_client',
        ...nativeSearchTag,
      ],
      uiInternalPath:
        '/app/enterprise_search/content/search_indices/new_index/connector?service_type=mssql',
      icons: [
        {
          type: 'svg',
          src: http.basePath.prepend('/plugins/enterpriseSearch/assets/source_icons/mssql.svg'),
        },
      ],
      shipper: 'enterprise_search',
      isBeta: false,
    });

    customIntegrations.registerCustomIntegration({
      id: 'network_drive_connector',
      title: i18n.translate(
        'xpack.enterpriseSearch.workplaceSearch.integrations.networkDriveName',
        {
          defaultMessage: 'Network Drive',
        }
      ),
      description: i18n.translate(
        'xpack.enterpriseSearch.workplaceSearch.integrations.netowkrDriveDescription',
        {
          defaultMessage: 'Search over your Network Drive content.',
        }
      ),
      categories: [
        'enterprise_search',
        'elastic_stack',
        'connector',
        'connector_client',
        ...nativeSearchTag,
      ],
      uiInternalPath:
        '/app/enterprise_search/content/search_indices/new_index/connector?service_type=network_drive',
      icons: [
        {
          type: 'svg',
          src: http.basePath.prepend(
            '/plugins/enterpriseSearch/assets/source_icons/network_drive.svg'
          ),
        },
      ],
      shipper: 'enterprise_search',
      isBeta: false,
    });

    customIntegrations.registerCustomIntegration({
      id: 'amazon_s3',
      title: i18n.translate('xpack.enterpriseSearch.workplaceSearch.integrations.s3', {
        defaultMessage: 'Amazon S3',
      }),
      description: i18n.translate(
        'xpack.enterpriseSearch.workplaceSearch.integrations.s3Description',
        {
          defaultMessage: 'Search over your content on Amazon S3.',
        }
      ),
      categories: [
        'enterprise_search',
        'datastore',
        'elastic_stack',
        'connector',
        'connector_client',
      ],
      uiInternalPath:
        '/app/enterprise_search/content/search_indices/new_index/connector?service_type=s3',
      icons: [
        {
          type: 'svg',
          src: http.basePath.prepend('/plugins/enterpriseSearch/assets/source_icons/s3.svg'),
        },
      ],
      shipper: 'enterprise_search',
      isBeta: false,
    });

    customIntegrations.registerCustomIntegration({
      id: 'google_cloud_storage',
      title: i18n.translate('xpack.enterpriseSearch.workplaceSearch.integrations.googleCloud', {
        defaultMessage: 'Google Cloud Storage',
      }),
      description: i18n.translate(
        'xpack.enterpriseSearch.workplaceSearch.integrations.googleCloudDescription',
        {
          defaultMessage: 'Search over your content on Google Cloud Storage.',
        }
      ),
      categories: ['enterprise_search', 'elastic_stack', 'custom', 'connector', 'connector_client'],
      uiInternalPath:
        '/app/enterprise_search/content/search_indices/new_index/connector?service_type=google_cloud_storage',
      icons: [
        {
          type: 'svg',
          src: http.basePath.prepend(
            '/plugins/enterpriseSearch/assets/source_icons/google_cloud_storage.svg'
          ),
        },
      ],
      shipper: 'enterprise_search',
      isBeta: false,
    });

    customIntegrations.registerCustomIntegration({
      id: 'google_drive',
      title: i18n.translate('xpack.enterpriseSearch.workplaceSearch.integrations.googleDrive', {
        defaultMessage: 'Google Drive',
      }),
      description: i18n.translate(
        'xpack.enterpriseSearch.workplaceSearch.integrations.googleDriveDescription',
        {
          defaultMessage: 'Search over your content on Google Drive.',
        }
      ),
      categories: ['enterprise_search', 'elastic_stack', 'custom', 'connector', 'connector_client'],
      uiInternalPath:
        '/app/enterprise_search/content/search_indices/new_index/connector?service_type=google_drive',
      icons: [
        {
          type: 'svg',
          src: http.basePath.prepend(
            '/plugins/enterpriseSearch/assets/source_icons/google_drive.svg'
          ),
        },
      ],
      shipper: 'enterprise_search',
      isBeta: false,
    });

    customIntegrations.registerCustomIntegration({
      id: 'azure_blob_storage',
      title: i18n.translate('xpack.enterpriseSearch.workplaceSearch.integrations.azureBlob', {
        defaultMessage: 'Azure Blob Storage',
      }),
      description: i18n.translate(
        'xpack.enterpriseSearch.workplaceSearch.integrations.azureBlobDescription',
        {
          defaultMessage: 'Search over your content on Azure Blob Storage.',
        }
      ),
      categories: [
        'enterprise_search',
        'elastic_stack',
        'custom',
        'connector',
        'connector_client',
        ...nativeSearchTag,
      ],
      uiInternalPath:
        '/app/enterprise_search/content/search_indices/new_index/connector?service_type=azure_blob_storage',
      icons: [
        {
          type: 'svg',
          src: http.basePath.prepend(
            '/plugins/enterpriseSearch/assets/source_icons/azure_blob_storage.svg'
          ),
        },
      ],
      shipper: 'enterprise_search',
      isBeta: false,
    });
    customIntegrations.registerCustomIntegration({
      id: 'confluence_cloud',
      title: i18n.translate('xpack.enterpriseSearch.integrations.connectors.confluenceTitle', {
        defaultMessage: 'Confluence Cloud',
      }),
      description: i18n.translate(
        'xpack.enterpriseSearch.integrations.connectors.confluenceDescription',
        {
          defaultMessage: 'Search over your content on Confluence Cloud.',
        }
      ),
      categories: [
        'enterprise_search',
        'elastic_stack',
        'custom',
        'connector',
        'connector_client',
        ...nativeSearchTag,
      ],
      uiInternalPath:
        '/app/enterprise_search/content/search_indices/new_index/connector?service_type=confluence',
      icons: [
        {
          type: 'svg',
          src: http.basePath.prepend(
            '/plugins/enterpriseSearch/assets/source_icons/confluence_cloud.svg'
          ),
        },
      ],
      shipper: 'enterprise_search',
      isBeta: false,
    });
    customIntegrations.registerCustomIntegration({
      id: 'confluence_server',
      title: i18n.translate(
        'xpack.enterpriseSearch.integrations.connectors.confluenceServerTitle',
        {
          defaultMessage: 'Confluence Server',
        }
      ),
      description: i18n.translate(
        'xpack.enterpriseSearch.integrations.connectors.confluenceServerDescription',
        {
          defaultMessage: 'Search over your content on Confluence Server.',
        }
      ),
      categories: ['enterprise_search', 'elastic_stack', 'custom', 'connector', 'connector_client'],
      uiInternalPath:
        '/app/enterprise_search/content/search_indices/new_index/connector?service_type=confluence',
      icons: [
        {
          type: 'svg',
          src: http.basePath.prepend(
            '/plugins/enterpriseSearch/assets/source_icons/confluence_cloud.svg'
          ),
        },
      ],
      shipper: 'enterprise_search',
      isBeta: false,
    });
    customIntegrations.registerCustomIntegration({
      id: 'jira_cloud',
      title: i18n.translate('xpack.enterpriseSearch.integrations.connectors.jiraCloudTitle', {
        defaultMessage: 'Jira Cloud',
      }),
      description: i18n.translate(
        'xpack.enterpriseSearch.integrations.connectors.jiraDescription',
        {
          defaultMessage: 'Search over your content on Jira Cloud.',
        }
      ),
      categories: [
        'enterprise_search',
        'elastic_stack',
        'custom',
        'connector',
        'connector_client',
        'jira',
        ...nativeSearchTag,
      ],
      uiInternalPath:
        '/app/enterprise_search/content/search_indices/new_index/connector?service_type=jira',
      icons: [
        {
          type: 'svg',
          src: http.basePath.prepend(
            '/plugins/enterpriseSearch/assets/source_icons/jira_cloud.svg'
          ),
        },
      ],
      shipper: 'enterprise_search',
      isBeta: false,
    });

    customIntegrations.registerCustomIntegration({
      id: 'jira_server',
      title: i18n.translate('xpack.enterpriseSearch.integrations.connectors.jiraServerTitle', {
        defaultMessage: 'Jira Server',
      }),
      description: i18n.translate(
        'xpack.enterpriseSearch.integrations.connectors.jiraServerDescription',
        {
          defaultMessage: 'Search over your content on Jira Server.',
        }
      ),
      categories: [
        'enterprise_search',
        'elastic_stack',
        'custom',
        'connector',
        'connector_client',
        'jira',
        ...nativeSearchTag,
      ],
      uiInternalPath:
        '/app/enterprise_search/content/search_indices/new_index/connector?service_type=jira',
      icons: [
        {
          type: 'svg',
          src: http.basePath.prepend(
            '/plugins/enterpriseSearch/assets/source_icons/jira_server.svg'
          ),
        },
      ],
      shipper: 'enterprise_search',
      isBeta: false,
    });
  }
};
