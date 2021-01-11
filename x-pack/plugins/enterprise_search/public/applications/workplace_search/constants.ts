/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { i18n } from '@kbn/i18n';

export const NAV = {
  OVERVIEW: i18n.translate('xpack.enterpriseSearch.workplaceSearch.nav.overview', {
    defaultMessage: 'Overview',
  }),
  SOURCES: i18n.translate('xpack.enterpriseSearch.workplaceSearch.nav.sources', {
    defaultMessage: 'Sources',
  }),
  GROUPS: i18n.translate('xpack.enterpriseSearch.workplaceSearch.nav.groups', {
    defaultMessage: 'Groups',
  }),
  GROUP_OVERVIEW: i18n.translate(
    'xpack.enterpriseSearch.workplaceSearch.nav.groups.groupOverview',
    {
      defaultMessage: 'Overview',
    }
  ),
  SOURCE_PRIORITIZATION: i18n.translate(
    'xpack.enterpriseSearch.workplaceSearch.nav.groups.sourcePrioritization',
    { defaultMessage: 'Source Prioritization' }
  ),
  CONTENT: i18n.translate('xpack.enterpriseSearch.workplaceSearch.nav.content', {
    defaultMessage: 'Content',
  }),
  ROLE_MAPPINGS: i18n.translate('xpack.enterpriseSearch.workplaceSearch.nav.roleMappings', {
    defaultMessage: 'Role Mappings',
  }),
  SECURITY: i18n.translate('xpack.enterpriseSearch.workplaceSearch.nav.security', {
    defaultMessage: 'Security',
  }),
  SCHEMA: i18n.translate('xpack.enterpriseSearch.workplaceSearch.nav.schema', {
    defaultMessage: 'Schema',
  }),
  DISPLAY_SETTINGS: i18n.translate('xpack.enterpriseSearch.workplaceSearch.nav.displaySettings', {
    defaultMessage: 'Display Settings',
  }),
  SETTINGS: i18n.translate('xpack.enterpriseSearch.workplaceSearch.nav.settings', {
    defaultMessage: 'Settings',
  }),
  ADD_SOURCE: i18n.translate('xpack.enterpriseSearch.workplaceSearch.nav.addSource', {
    defaultMessage: 'Add Source',
  }),
  PERSONAL_DASHBOARD: i18n.translate(
    'xpack.enterpriseSearch.workplaceSearch.nav.personalDashboard',
    {
      defaultMessage: 'View my personal dashboard',
    }
  ),
  SEARCH: i18n.translate('xpack.enterpriseSearch.workplaceSearch.nav.searchApplication', {
    defaultMessage: 'Go to search application',
  }),
};

export const MAX_TABLE_ROW_ICONS = 3;

export const SOURCE_STATUSES = {
  INDEXING: 'indexing',
  SYNCED: 'synced',
  SYNCING: 'syncing',
  AWAITING_USER_ACTION: 'awaiting_user_action',
  ERROR: 'error',
  DISCONNECTED: 'disconnected',
  ALWAYS_SYNCED: 'always_synced',
};

export const SOURCE_NAMES = {
  BOX: i18n.translate('xpack.enterpriseSearch.workplaceSearch.sources.sourceNames.box', {
    defaultMessage: 'Box',
  }),
  CONFLUENCE: i18n.translate(
    'xpack.enterpriseSearch.workplaceSearch.sources.sourceNames.confluence',
    { defaultMessage: 'Confluence' }
  ),
  CONFLUENCE_SERVER: i18n.translate(
    'xpack.enterpriseSearch.workplaceSearch.sources.sourceNames.confluenceServer',
    { defaultMessage: 'Confluence (Server)' }
  ),
  DROPBOX: i18n.translate('xpack.enterpriseSearch.workplaceSearch.sources.sourceNames.dropbox', {
    defaultMessage: 'Dropbox',
  }),
  GITHUB: i18n.translate('xpack.enterpriseSearch.workplaceSearch.sources.sourceNames.github', {
    defaultMessage: 'GitHub',
  }),
  GITHUB_ENTERPRISE: i18n.translate(
    'xpack.enterpriseSearch.workplaceSearch.sources.sourceNames.githubEnterprise',
    { defaultMessage: 'GitHub Enterprise Server' }
  ),
  GMAIL: i18n.translate('xpack.enterpriseSearch.workplaceSearch.sources.sourceNames.gmail', {
    defaultMessage: 'Gmail',
  }),
  GOOGLE_DRIVE: i18n.translate(
    'xpack.enterpriseSearch.workplaceSearch.sources.sourceNames.googleDrive',
    { defaultMessage: 'Google Drive' }
  ),
  JIRA: i18n.translate('xpack.enterpriseSearch.workplaceSearch.sources.sourceNames.jira', {
    defaultMessage: 'Jira',
  }),
  JIRA_SERVER: i18n.translate(
    'xpack.enterpriseSearch.workplaceSearch.sources.sourceNames.jiraServer',
    { defaultMessage: 'Jira (Server)' }
  ),
  ONEDRIVE: i18n.translate('xpack.enterpriseSearch.workplaceSearch.sources.sourceNames.oneDrive', {
    defaultMessage: 'OneDrive',
  }),
  SALESFORCE: i18n.translate(
    'xpack.enterpriseSearch.workplaceSearch.sources.sourceNames.salesforce',
    { defaultMessage: 'Salesforce' }
  ),
  SALESFORCE_SANDBOX: i18n.translate(
    'xpack.enterpriseSearch.workplaceSearch.sources.sourceNames.salesforceSandbox',
    { defaultMessage: 'Salesforce Sandbox' }
  ),
  SERVICENOW: i18n.translate(
    'xpack.enterpriseSearch.workplaceSearch.sources.sourceNames.serviceNow',
    { defaultMessage: 'ServiceNow' }
  ),
  SHAREPOINT: i18n.translate(
    'xpack.enterpriseSearch.workplaceSearch.sources.sourceNames.sharePoint',
    { defaultMessage: 'SharePoint Online' }
  ),
  SLACK: i18n.translate('xpack.enterpriseSearch.workplaceSearch.sources.sourceNames.slack', {
    defaultMessage: 'Slack',
  }),
  ZENDESK: i18n.translate('xpack.enterpriseSearch.workplaceSearch.sources.sourceNames.zendesk', {
    defaultMessage: 'Zendesk',
  }),
  CUSTOM: i18n.translate('xpack.enterpriseSearch.workplaceSearch.sources.sourceNames.custom', {
    defaultMessage: 'Custom API Source',
  }),
};

export const SOURCE_OBJ_TYPES = {
  PAGES: i18n.translate('xpack.enterpriseSearch.workplaceSearch.sources.objTypes.pages', {
    defaultMessage: 'Pages',
  }),
  ATTACHMENTS: i18n.translate(
    'xpack.enterpriseSearch.workplaceSearch.sources.objTypes.attachments',
    { defaultMessage: 'Attachments' }
  ),
  BLOG_POSTS: i18n.translate('xpack.enterpriseSearch.workplaceSearch.sources.objTypes.blogPosts', {
    defaultMessage: 'Blog Posts',
  }),
  SITES: i18n.translate('xpack.enterpriseSearch.workplaceSearch.sources.objTypes.sites', {
    defaultMessage: 'Sites',
  }),
  SPACES: i18n.translate('xpack.enterpriseSearch.workplaceSearch.sources.objTypes.spaces', {
    defaultMessage: 'Spaces',
  }),
  ALL_FILES: i18n.translate('xpack.enterpriseSearch.workplaceSearch.sources.objTypes.allFiles', {
    defaultMessage:
      'All Files (including images, PDFs, spreadsheets, textual documents, presentations)',
  }),
  ALL_STORED_FILES: i18n.translate(
    'xpack.enterpriseSearch.workplaceSearch.sources.objTypes.allStoredFiles',
    {
      defaultMessage:
        'All Stored Files (including images, videos, PDFs, spreadsheets, textual documents, presentations)',
    }
  ),
  G_SUITE_FILES: i18n.translate(
    'xpack.enterpriseSearch.workplaceSearch.sources.objTypes.gSuiteFiles',
    {
      defaultMessage: 'Google G Suite Documents (Docs, Sheets, Slides)',
    }
  ),
  EPICS: i18n.translate('xpack.enterpriseSearch.workplaceSearch.sources.objTypes.epics', {
    defaultMessage: 'Epics',
  }),
  PROJECTS: i18n.translate('xpack.enterpriseSearch.workplaceSearch.sources.objTypes.projects', {
    defaultMessage: 'Projects',
  }),
  TASKS: i18n.translate('xpack.enterpriseSearch.workplaceSearch.sources.objTypes.tasks', {
    defaultMessage: 'Tasks',
  }),
  STORIES: i18n.translate('xpack.enterpriseSearch.workplaceSearch.sources.objTypes.stories', {
    defaultMessage: 'Stories',
  }),
  BUGS: i18n.translate('xpack.enterpriseSearch.workplaceSearch.sources.objTypes.bugs', {
    defaultMessage: 'Bugs',
  }),
  ISSUES: i18n.translate('xpack.enterpriseSearch.workplaceSearch.sources.objTypes.issues', {
    defaultMessage: 'Issues',
  }),
  PULL_REQUESTS: i18n.translate(
    'xpack.enterpriseSearch.workplaceSearch.sources.objTypes.pullRequests',
    {
      defaultMessage: 'Pull Requests',
    }
  ),
  REPOSITORY_LIST: i18n.translate(
    'xpack.enterpriseSearch.workplaceSearch.sources.objTypes.repositoryList',
    {
      defaultMessage: 'Repository List',
    }
  ),
  EMAILS: i18n.translate('xpack.enterpriseSearch.workplaceSearch.sources.objTypes.emails', {
    defaultMessage: 'Emails',
  }),
  CONTACTS: i18n.translate('xpack.enterpriseSearch.workplaceSearch.sources.objTypes.contacts', {
    defaultMessage: 'Contacts',
  }),
  OPPORTUNITIES: i18n.translate(
    'xpack.enterpriseSearch.workplaceSearch.sources.objTypes.opportunities',
    {
      defaultMessage: 'Opportunities',
    }
  ),
  LEADS: i18n.translate('xpack.enterpriseSearch.workplaceSearch.sources.objTypes.leads', {
    defaultMessage: 'Leads',
  }),
  ACCOUNTS: i18n.translate('xpack.enterpriseSearch.workplaceSearch.sources.objTypes.accounts', {
    defaultMessage: 'Accounts',
  }),
  CAMPAIGNS: i18n.translate('xpack.enterpriseSearch.workplaceSearch.sources.objTypes.campaigns', {
    defaultMessage: 'Campaigns',
  }),
  USERS: i18n.translate('xpack.enterpriseSearch.workplaceSearch.sources.objTypes.users', {
    defaultMessage: 'Users',
  }),
  INCIDENTS: i18n.translate('xpack.enterpriseSearch.workplaceSearch.sources.objTypes.incidents', {
    defaultMessage: 'Incidents',
  }),
  ITEMS: i18n.translate('xpack.enterpriseSearch.workplaceSearch.sources.objTypes.items', {
    defaultMessage: 'Items',
  }),
  ARTICLES: i18n.translate('xpack.enterpriseSearch.workplaceSearch.sources.objTypes.articles', {
    defaultMessage: 'Articles',
  }),
  TICKETS: i18n.translate('xpack.enterpriseSearch.workplaceSearch.sources.objTypes.tickets', {
    defaultMessage: 'Tickets',
  }),
  PUBLIC_MESSAGES: i18n.translate(
    'xpack.enterpriseSearch.workplaceSearch.sources.objTypes.publicMessages',
    {
      defaultMessage: 'Public channel messages',
    }
  ),
  PRIVATE_MESSAGES: i18n.translate(
    'xpack.enterpriseSearch.workplaceSearch.sources.objTypes.privateMessages',
    {
      defaultMessage: 'Private channel messages in which you are an active participant',
    }
  ),
  DIRECT_MESSAGES: i18n.translate(
    'xpack.enterpriseSearch.workplaceSearch.sources.objTypes.directMessages',
    {
      defaultMessage: 'Direct messages',
    }
  ),
};

export const GITHUB_LINK_TITLE = i18n.translate(
  'xpack.enterpriseSearch.workplaceSearch.sources.applicationLinkTitles.github',
  {
    defaultMessage: 'GitHub Developer Portal',
  }
);

export const CUSTOM_SERVICE_TYPE = 'custom';

export const DOCUMENTATION_LINK_TITLE = i18n.translate(
  'xpack.enterpriseSearch.workplaceSearch.sources.documentation',
  {
    defaultMessage: 'Documentation',
  }
);

export const PUBLIC_KEY_LABEL = i18n.translate(
  'xpack.enterpriseSearch.workplaceSearc.publicKey.label',
  {
    defaultMessage: 'Public Key',
  }
);

export const CONSUMER_KEY_LABEL = i18n.translate(
  'xpack.enterpriseSearch.workplaceSearc.consumerKey.label',
  {
    defaultMessage: 'Consumer Key',
  }
);

export const BASE_URI_LABEL = i18n.translate(
  'xpack.enterpriseSearch.workplaceSearc.baseUri.label',
  {
    defaultMessage: 'Base URI',
  }
);

export const BASE_URL_LABEL = i18n.translate(
  'xpack.enterpriseSearch.workplaceSearc.baseUrl.label',
  {
    defaultMessage: 'Base URL',
  }
);

export const CLIENT_ID_LABEL = i18n.translate(
  'xpack.enterpriseSearch.workplaceSearc.clientId.label',
  {
    defaultMessage: 'Client id',
  }
);

export const CLIENT_SECRET_LABEL = i18n.translate(
  'xpack.enterpriseSearch.workplaceSearc.clientSecret.label',
  {
    defaultMessage: 'Client secret',
  }
);
