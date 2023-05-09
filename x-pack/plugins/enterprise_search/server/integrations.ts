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
    categories: ['enterprise_search', 'workplace_search', 'content_source'],
  },
  {
    id: 'confluence_cloud',
    title: i18n.translate(
      'xpack.enterpriseSearch.workplaceSearch.integrations.confluenceCloudName',
      {
        defaultMessage: 'Confluence Cloud',
      }
    ),
    description: i18n.translate(
      'xpack.enterpriseSearch.workplaceSearch.integrations.confluenceCloudDescription',
      {
        defaultMessage:
          'Search over your organizational content on Confluence Cloud with Workplace Search.',
      }
    ),
    categories: [
      'enterprise_search',
      'custom',
      'workplace_search',
      'content_source',
      'connector_package',
    ],
  },
  {
    id: 'confluence_server',
    title: i18n.translate(
      'xpack.enterpriseSearch.workplaceSearch.integrations.confluenceServerName',
      {
        defaultMessage: 'Confluence Server',
      }
    ),
    description: i18n.translate(
      'xpack.enterpriseSearch.workplaceSearch.integrations.confluenceServerDescription',
      {
        defaultMessage:
          'Search over your organizational content on Confluence Server with Workplace Search.',
      }
    ),
    categories: ['enterprise_search', 'workplace_search', 'content_source'],
  },
  {
    id: 'dropbox',
    title: i18n.translate('xpack.enterpriseSearch.workplaceSearch.integrations.dropboxName', {
      defaultMessage: 'Dropbox',
    }),
    description: i18n.translate(
      'xpack.enterpriseSearch.workplaceSearch.integrations.dropboxDescription',
      {
        defaultMessage:
          'Search over your files and folders stored on Dropbox with Workplace Search.',
      }
    ),
    categories: ['enterprise_search', 'workplace_search', 'content_source'],
  },
  {
    id: 'github',
    title: i18n.translate('xpack.enterpriseSearch.workplaceSearch.integrations.githubName', {
      defaultMessage: 'GitHub',
    }),
    description: i18n.translate(
      'xpack.enterpriseSearch.workplaceSearch.integrations.githubDescription',
      {
        defaultMessage: 'Search over your projects and repos on GitHub with Workplace Search.',
      }
    ),
    categories: ['enterprise_search', 'workplace_search', 'content_source'],
  },
  {
    id: 'github_enterprise_server',
    title: i18n.translate(
      'xpack.enterpriseSearch.workplaceSearch.integrations.githubEnterpriseServerName',
      {
        defaultMessage: 'GitHub Enterprise Server',
      }
    ),
    description: i18n.translate(
      'xpack.enterpriseSearch.workplaceSearch.integrations.githubEnterpriseServerDescription',
      {
        defaultMessage:
          'Search over your projects and repos on GitHub Enterprise Server with Workplace Search.',
      }
    ),
    categories: ['enterprise_search', 'workplace_search', 'content_source'],
  },
  {
    id: 'gmail',
    title: i18n.translate('xpack.enterpriseSearch.workplaceSearch.integrations.gmailName', {
      defaultMessage: 'Gmail',
    }),
    description: i18n.translate(
      'xpack.enterpriseSearch.workplaceSearch.integrations.gmailDescription',
      {
        defaultMessage: 'Search over your emails managed by Gmail with Workplace Search.',
      }
    ),
    categories: ['enterprise_search', 'google_cloud', 'workplace_search', 'content_source'],
  },
  {
    id: 'google_drive',
    title: i18n.translate('xpack.enterpriseSearch.workplaceSearch.integrations.googleDriveName', {
      defaultMessage: 'Google Drive',
    }),
    description: i18n.translate(
      'xpack.enterpriseSearch.workplaceSearch.integrations.googleDriveDescription',
      {
        defaultMessage: 'Search over your documents on Google Drive with Workplace Search.',
      }
    ),
    categories: ['enterprise_search', 'google_cloud', 'workplace_search', 'content_source'],
  },
  {
    id: 'jira_cloud',
    title: i18n.translate('xpack.enterpriseSearch.workplaceSearch.integrations.jiraCloudName', {
      defaultMessage: 'Jira Cloud',
    }),
    description: i18n.translate(
      'xpack.enterpriseSearch.workplaceSearch.integrations.jiraCloudDescription',
      {
        defaultMessage: 'Search over your project workflow on Jira Cloud with Workplace Search.',
      }
    ),
    categories: ['enterprise_search', 'workplace_search', 'content_source'],
  },
  {
    id: 'jira_server',
    title: i18n.translate('xpack.enterpriseSearch.workplaceSearch.integrations.jiraServerName', {
      defaultMessage: 'Jira Server',
    }),
    description: i18n.translate(
      'xpack.enterpriseSearch.workplaceSearch.integrations.jiraServerDescription',
      {
        defaultMessage: 'Search over your project workflow on Jira Server with Workplace Search.',
      }
    ),
    categories: ['enterprise_search', 'workplace_search', 'content_source'],
  },
  {
    id: 'network_drive',
    title: i18n.translate('xpack.enterpriseSearch.workplaceSearch.integrations.networkDriveName', {
      defaultMessage: 'Network Drive',
    }),
    description: i18n.translate(
      'xpack.enterpriseSearch.workplaceSearch.integrations.networkDriveDescription',
      {
        defaultMessage:
          'Search over your files and folders stored on network drives with Workplace Search.',
      }
    ),
    categories: ['enterprise_search', 'content_source', 'custom', 'workplace_search'],
    uiInternalPath: '/app/enterprise_search/workplace_search/sources/add/network_drive/custom',
  },
  {
    id: 'onedrive',
    title: i18n.translate('xpack.enterpriseSearch.workplaceSearch.integrations.onedriveName', {
      defaultMessage: 'OneDrive',
    }),
    description: i18n.translate(
      'xpack.enterpriseSearch.workplaceSearch.integrations.onedriveDescription',
      {
        defaultMessage: 'Search over your files stored on OneDrive with Workplace Search.',
      }
    ),
    categories: ['enterprise_search', 'azure', 'workplace_search', 'content_source'],
    uiInternalPath: '/app/enterprise_search/workplace_search/sources/add/one_drive',
  },
  {
    id: 'salesforce',
    title: i18n.translate('xpack.enterpriseSearch.workplaceSearch.integrations.salesforceName', {
      defaultMessage: 'Salesforce',
    }),
    description: i18n.translate(
      'xpack.enterpriseSearch.workplaceSearch.integrations.salesforceDescription',
      {
        defaultMessage: 'Search over your content on Salesforce with Workplace Search.',
      }
    ),
    categories: ['enterprise_search', 'workplace_search', 'content_source'],
  },
  {
    id: 'salesforce_sandbox',
    title: i18n.translate(
      'xpack.enterpriseSearch.workplaceSearch.integrations.salesforceSandboxName',
      {
        defaultMessage: 'Salesforce Sandbox',
      }
    ),
    description: i18n.translate(
      'xpack.enterpriseSearch.workplaceSearch.integrations.salesforceSandboxDescription',
      {
        defaultMessage: 'Search over your content on Salesforce Sandbox with Workplace Search.',
      }
    ),
    categories: ['enterprise_search', 'workplace_search', 'content_source'],
  },
  {
    id: 'servicenow',
    title: i18n.translate('xpack.enterpriseSearch.workplaceSearch.integrations.servicenowName', {
      defaultMessage: 'ServiceNow',
    }),
    description: i18n.translate(
      'xpack.enterpriseSearch.workplaceSearch.integrations.servicenowDescription',
      {
        defaultMessage: 'Search over your content on ServiceNow with Workplace Search.',
      }
    ),
    categories: ['enterprise_search', 'workplace_search', 'content_source'],
  },
  {
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
        defaultMessage: 'Search over your files stored on SharePoint Online with Workplace Search.',
      }
    ),
    categories: [
      'enterprise_search',
      'azure',
      'custom',
      'workplace_search',
      'content_source',
      'connector_package',
    ],
    uiInternalPath: '/app/enterprise_search/workplace_search/sources/add/share_point',
  },
  {
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
        defaultMessage:
          'Search over your files stored on Microsoft SharePoint Server with Workplace Search.',
      }
    ),
    categories: [
      'enterprise_search',
      'azure',
      'custom',
      'workplace_search',
      'content_source',
      'connector_package',
    ],
    uiInternalPath: '/app/enterprise_search/workplace_search/sources/add/share_point_server/custom',
  },
  {
    id: 'slack',
    title: i18n.translate('xpack.enterpriseSearch.workplaceSearch.integrations.slackName', {
      defaultMessage: 'Slack',
    }),
    description: i18n.translate(
      'xpack.enterpriseSearch.workplaceSearch.integrations.slackDescription',
      {
        defaultMessage: 'Search over your messages on Slack with Workplace Search.',
      }
    ),
    categories: ['enterprise_search', 'workplace_search', 'content_source'],
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
    categories: ['enterprise_search', 'workplace_search', 'content_source'],
  },
];

export const registerEnterpriseSearchIntegrations = (
  config: ConfigType,
  http: HttpServiceSetup,
  customIntegrations: CustomIntegrationsPluginSetup
) => {
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
        defaultMessage: 'Add search to your website with the Enterprise Search web crawler.',
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

  if (config.hasNativeConnectors) {
    customIntegrations.registerCustomIntegration({
      id: 'native_connector',
      title: i18n.translate(
        'xpack.enterpriseSearch.workplaceSearch.integrations.nativeConnectorName',
        {
          defaultMessage: 'Use a connector',
        }
      ),
      description: i18n.translate(
        'xpack.enterpriseSearch.workplaceSearch.integrations.nativeConnectorDescription',
        {
          defaultMessage:
            'Search over your data sources with a native Enterprise Search connector.',
        }
      ),
      categories: ['enterprise_search', 'custom', 'elastic_stack', 'connector', 'native_search'],
      uiInternalPath: '/app/enterprise_search/content/search_indices/new_index/connector',
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
      id: 'mongodb',
      title: i18n.translate('xpack.enterpriseSearch.workplaceSearch.integrations.mongoDBName', {
        defaultMessage: 'MongoDB',
      }),
      description: i18n.translate(
        'xpack.enterpriseSearch.workplaceSearch.integrations.mongoDBDescription',
        {
          defaultMessage: 'Search over your MongoDB content with Enterprise Search.',
        }
      ),
      categories: [
        'enterprise_search',
        'datastore',
        'elastic_stack',
        'native_search',
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
          defaultMessage: 'Search over your MySQL content with Enterprise Search.',
        }
      ),
      categories: [
        'enterprise_search',
        'datastore',
        'elastic_stack',
        'native_search',
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
  }

  if (config.hasConnectors) {
    customIntegrations.registerCustomIntegration({
      id: 'build_a_connector',
      title: i18n.translate('xpack.enterpriseSearch.integrations.buildAConnectorName', {
        defaultMessage: 'Build a connector',
      }),
      description: i18n.translate(
        'xpack.enterpriseSearch.integrations.buildAConnectorDescription',
        {
          defaultMessage: 'Search over data stored on custom data sources with Enterprise Search.',
        }
      ),
      categories: ['enterprise_search', 'custom', 'elastic_stack', 'connector_client'],
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
          defaultMessage: 'Search over your content on PostgreSQL with Enterprise Search.',
        }
      ),
      categories: ['enterprise_search', 'elastic_stack', 'custom', 'datastore'],
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
      id: 'oracle',
      title: i18n.translate('xpack.enterpriseSearch.workplaceSearch.integrations.oracleName', {
        defaultMessage: 'Oracle',
      }),
      description: i18n.translate(
        'xpack.enterpriseSearch.workplaceSearch.integrations.oracleDescription',
        {
          defaultMessage: 'Search over your content on Oracle with Enterprise Search.',
        }
      ),
      categories: ['enterprise_search', 'elastic_stack', 'custom', 'datastore'],
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
          defaultMessage:
            'Search over your content on Microsoft SQL Server with Enterprise Search.',
        }
      ),
      categories: ['enterprise_search', 'custom', 'elastic_stack', 'datastore'],
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
          defaultMessage: 'Search over your Network Drive content with Enterprise Search.',
        }
      ),
      categories: [
        'enterprise_search',
        'elastic_stack',
        'custom',
        'workplace_search',
        'connector',
        'connector_client',
        'connector_package',
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
          defaultMessage: 'Search over your content on Amazon S3 with Enterprise Search.',
        }
      ),
      categories: ['enterprise_search', 'datastore', 'elastic_stack'],
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
          defaultMessage:
            'Search over your content on Google Cloud Storage with Enterprise Search.',
        }
      ),
      categories: ['enterprise_search', 'elastic_stack', 'custom'],
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
      id: 'azure_blob_storage',
      title: i18n.translate('xpack.enterpriseSearch.workplaceSearch.integrations.azureBlob', {
        defaultMessage: 'Azure Blob Storage',
      }),
      description: i18n.translate(
        'xpack.enterpriseSearch.workplaceSearch.integrations.azureBlobDescription',
        {
          defaultMessage: 'Search over your content on Azure Blob Storage with Enterprise Search.',
        }
      ),
      categories: ['enterprise_search', 'elastic_stack', 'custom'],
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
  }
};
