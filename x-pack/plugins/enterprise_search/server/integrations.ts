/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { i18n } from '@kbn/i18n';
import type { HttpServiceSetup } from 'src/core/server';

import type { IntegrationCategory } from '../../../../src/plugins/custom_integrations/common';
import type { CustomIntegrationsPluginSetup } from '../../../../src/plugins/custom_integrations/server';

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
    categories: ['file_storage'],
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
    categories: ['productivity'],
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
    categories: ['productivity'],
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
    categories: ['file_storage'],
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
    categories: ['productivity'],
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
    categories: ['productivity'],
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
    categories: ['communications'],
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
    categories: ['file_storage'],
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
    categories: ['productivity'],
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
    categories: ['productivity'],
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
    categories: ['file_storage'],
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
    categories: ['productivity'],
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
    categories: ['productivity'],
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
    categories: ['productivity'],
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
    categories: ['file_storage'],
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
    categories: ['enterprise_search', 'file_storage', 'microsoft_365'],
    uiInternalPath: '/app/enterprise_search/workplace_search/sources/add/sharepoint_server',
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
    categories: ['communications'],
  },
  {
    id: 'teams',
    title: i18n.translate('xpack.enterpriseSearch.workplaceSearch.integrations.teamsName', {
      defaultMessage: 'Teams',
    }),
    description: i18n.translate(
      'xpack.enterpriseSearch.workplaceSearch.integrations.teamsDescription',
      {
        defaultMessage:
          'Search over meeting recordings, chats and other communications with Enterprise Search.',
      }
    ),
    categories: ['enterprise_search', 'microsoft_365', 'communications', 'productivity'],
    uiInternalPath: '/app/enterprise_search/workplace_search/sources/add/teams',
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
    categories: ['communications'],
  },
  {
    id: 'custom_api_source',
    title: i18n.translate(
      'xpack.enterpriseSearch.workplaceSearch.integrations.customApiSourceName',
      {
        defaultMessage: 'Custom API Source',
      }
    ),
    description: i18n.translate(
      'xpack.enterpriseSearch.workplaceSearch.integrations.customApiSourceDescription',
      {
        defaultMessage:
          'Search over anything by building your own integration with Workplace Search.',
      }
    ),
    categories: ['custom'],
    uiInternalPath: '/app/enterprise_search/workplace_search/sources/add/custom',
  },
];

export const registerEnterpriseSearchIntegrations = (
  http: HttpServiceSetup,
  customIntegrations: CustomIntegrationsPluginSetup
) => {
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
    id: 'app_search_web_crawler',
    title: i18n.translate('xpack.enterpriseSearch.appSearch.integrations.webCrawlerName', {
      defaultMessage: 'Web site crawler',
    }),
    description: i18n.translate(
      'xpack.enterpriseSearch.appSearch.integrations.webCrawlerDescription',
      {
        defaultMessage: 'Add search to your website with the App Search web crawler.',
      }
    ),
    categories: ['website_search'],
    uiInternalPath: '/app/enterprise_search/app_search/engines/new?method=crawler',
    icons: [
      {
        type: 'eui',
        src: 'logoAppSearch',
      },
    ],
    shipper: 'enterprise_search',
    isBeta: false,
  });

  customIntegrations.registerCustomIntegration({
    id: 'app_search_json',
    title: i18n.translate('xpack.enterpriseSearch.appSearch.integrations.jsonName', {
      defaultMessage: 'JSON',
    }),
    description: i18n.translate('xpack.enterpriseSearch.appSearch.integrations.jsonDescription', {
      defaultMessage: 'Search over your JSON data with App Search.',
    }),
    categories: ['upload_file'],
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

  customIntegrations.registerCustomIntegration({
    id: 'app_search_api',
    title: i18n.translate('xpack.enterpriseSearch.appSearch.integrations.apiName', {
      defaultMessage: 'API',
    }),
    description: i18n.translate('xpack.enterpriseSearch.appSearch.integrations.apiDescription', {
      defaultMessage: "Add search to your application with App Search's robust APIs.",
    }),
    categories: ['custom'],
    uiInternalPath: '/app/enterprise_search/app_search/engines/new?method=api',
    icons: [
      {
        type: 'eui',
        src: 'logoAppSearch',
      },
    ],
    shipper: 'enterprise_search',
    isBeta: false,
  });
};
