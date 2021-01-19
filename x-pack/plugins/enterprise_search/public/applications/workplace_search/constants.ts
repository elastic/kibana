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
  SETTINGS_CUSTOMIZE: i18n.translate(
    'xpack.enterpriseSearch.workplaceSearch.nav.settingsCustomize',
    {
      defaultMessage: 'Customize',
    }
  ),
  SETTINGS_SOURCE_PRIORITIZATION: i18n.translate(
    'xpack.enterpriseSearch.workplaceSearch.nav.settingsSourcePrioritization',
    {
      defaultMessage: 'Content source connectors',
    }
  ),
  SETTINGS_OAUTH: i18n.translate('xpack.enterpriseSearch.workplaceSearch.nav.settingsOauth', {
    defaultMessage: 'OAuth application',
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
  FOLDERS: i18n.translate('xpack.enterpriseSearch.workplaceSearch.sources.objTypes.folders', {
    defaultMessage: 'Folders',
  }),
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
  'xpack.enterpriseSearch.workplaceSearch.publicKey.label',
  {
    defaultMessage: 'Public Key',
  }
);

export const CONSUMER_KEY_LABEL = i18n.translate(
  'xpack.enterpriseSearch.workplaceSearch.consumerKey.label',
  {
    defaultMessage: 'Consumer Key',
  }
);

export const BASE_URI_LABEL = i18n.translate(
  'xpack.enterpriseSearch.workplaceSearch.baseUri.label',
  {
    defaultMessage: 'Base URI',
  }
);

export const BASE_URL_LABEL = i18n.translate(
  'xpack.enterpriseSearch.workplaceSearch.baseUrl.label',
  {
    defaultMessage: 'Base URL',
  }
);

export const CLIENT_ID_LABEL = i18n.translate(
  'xpack.enterpriseSearch.workplaceSearch.clientId.label',
  {
    defaultMessage: 'Client id',
  }
);

export const CLIENT_SECRET_LABEL = i18n.translate(
  'xpack.enterpriseSearch.workplaceSearch.clientSecret.label',
  {
    defaultMessage: 'Client secret',
  }
);

export const CONFIDENTIAL_LABEL = i18n.translate(
  'xpack.enterpriseSearch.workplaceSearch.confidential.label',
  {
    defaultMessage: 'Confidential',
  }
);

export const CONFIDENTIAL_HELP_TEXT = i18n.translate(
  'xpack.enterpriseSearch.workplaceSearch.confidential.text',
  {
    defaultMessage:
      'Deselect for environments in which the client secret cannot be kept confidential, such as native mobile apps and single page applications.',
  }
);

export const CREDENTIALS_TITLE = i18n.translate(
  'xpack.enterpriseSearch.workplaceSearch.credentials.title',
  {
    defaultMessage: 'Credentials',
  }
);

export const CREDENTIALS_DESCRIPTION = i18n.translate(
  'xpack.enterpriseSearch.workplaceSearch.credentials.description',
  {
    defaultMessage:
      'Use the following credentials within your client to request access tokens from our authentication server.',
  }
);

export const ORG_UPDATED_MESSAGE = i18n.translate(
  'xpack.enterpriseSearch.workplaceSearch.settings.orgUpdated.message',
  {
    defaultMessage: 'Successfully updated organization.',
  }
);

export const OAUTH_APP_UPDATED_MESSAGE = i18n.translate(
  'xpack.enterpriseSearch.workplaceSearch.settings.oauthAppUpdated.message',
  {
    defaultMessage: 'Successfully updated application.',
  }
);

export const SAVE_CHANGES_BUTTON = i18n.translate(
  'xpack.enterpriseSearch.workplaceSearch.saveChanges.button',
  {
    defaultMessage: 'Save changes',
  }
);

export const NAME_LABEL = i18n.translate('xpack.enterpriseSearch.workplaceSearch.name.label', {
  defaultMessage: 'Name',
});

export const OAUTH_DESCRIPTION = i18n.translate(
  'xpack.enterpriseSearch.workplaceSearch.oauth.description',
  {
    defaultMessage: 'Create an OAuth client for your organization.',
  }
);

export const OAUTH_PERSISTED_DESCRIPTION = i18n.translate(
  'xpack.enterpriseSearch.workplaceSearch.oauthPersisted.description',
  {
    defaultMessage:
      "Access your organization's OAuth client credentials and manage OAuth settings.",
  }
);

export const REDIRECT_URIS_LABEL = i18n.translate(
  'xpack.enterpriseSearch.workplaceSearch.redirectURIs.label',
  {
    defaultMessage: 'Redirect URIs',
  }
);

export const REDIRECT_HELP_TEXT = i18n.translate(
  'xpack.enterpriseSearch.workplaceSearch.redirectHelp.text',
  {
    defaultMessage: 'Provide one URI per line.',
  }
);

export const REDIRECT_NATIVE_HELP_TEXT = i18n.translate(
  'xpack.enterpriseSearch.workplaceSearch.redirectNativeHelp.text',
  {
    defaultMessage: 'For local development URIs, use format',
  }
);

export const REDIRECT_SECURE_ERROR_TEXT = i18n.translate(
  'xpack.enterpriseSearch.workplaceSearch.redirectSecureError.text',
  {
    defaultMessage: 'Cannot contain duplicate redirect URIs.',
  }
);

export const REDIRECT_INSECURE_ERROR_TEXT = i18n.translate(
  'xpack.enterpriseSearch.workplaceSearch.redirectInsecureError.text',
  {
    defaultMessage: 'Using an insecure redirect URI (http) is not recommended.',
  }
);

export const LICENSE_MODAL_TITLE = i18n.translate(
  'xpack.enterpriseSearch.workplaceSearch.licenseModal.title',
  {
    defaultMessage: 'Configuring OAuth for Custom Search Applications',
  }
);

export const LICENSE_MODAL_DESCRIPTION = i18n.translate(
  'xpack.enterpriseSearch.workplaceSearch.licenseModal.description',
  {
    defaultMessage:
      'Configure an OAuth application for secure use of the Workplace Search Search API. Upgrade to a Platinum license to enable the Search API and create your OAuth application.',
  }
);

export const LICENSE_MODAL_LINK = i18n.translate(
  'xpack.enterpriseSearch.workplaceSearch.licenseModal.link',
  {
    defaultMessage: 'Explore Platinum features',
  }
);

export const CUSTOMIZE_HEADER_TITLE = i18n.translate(
  'xpack.enterpriseSearch.workplaceSearch.customize.header.title',
  {
    defaultMessage: 'Customize Workplace Search',
  }
);

export const CUSTOMIZE_HEADER_DESCRIPTION = i18n.translate(
  'xpack.enterpriseSearch.workplaceSearch.customize.header.description',
  {
    defaultMessage: 'Personalize general organization settings.',
  }
);

export const CUSTOMIZE_NAME_LABEL = i18n.translate(
  'xpack.enterpriseSearch.workplaceSearch.customize.name.label',
  {
    defaultMessage: 'Personalize general organization settings.',
  }
);

export const CUSTOMIZE_NAME_BUTTON = i18n.translate(
  'xpack.enterpriseSearch.workplaceSearch.customize.name.button',
  {
    defaultMessage: 'Save organization name',
  }
);

export const UPDATE_BUTTON = i18n.translate(
  'xpack.enterpriseSearch.workplaceSearch.update.button',
  {
    defaultMessage: 'Update',
  }
);

export const CONFIGURE_BUTTON = i18n.translate(
  'xpack.enterpriseSearch.workplaceSearch.configure.button',
  {
    defaultMessage: 'Configure',
  }
);

export const PRIVATE_PLATINUM_LICENSE_CALLOUT = i18n.translate(
  'xpack.enterpriseSearch.workplaceSearch.privatePlatinumCallout.text',
  {
    defaultMessage: 'Private Sources require a Platinum license.',
  }
);

export const PRIVATE_SOURCE = i18n.translate(
  'xpack.enterpriseSearch.workplaceSearch.privateSource.text',
  {
    defaultMessage: 'Private Source',
  }
);

export const CONNECTORS_HEADER_TITLE = i18n.translate(
  'xpack.enterpriseSearch.workplaceSearch.connectors.header.title',
  {
    defaultMessage: 'Content source connectors',
  }
);

export const CONNECTORS_HEADER_DESCRIPTION = i18n.translate(
  'xpack.enterpriseSearch.workplaceSearch.connectors.header.description',
  {
    defaultMessage: 'All of your configurable connectors.',
  }
);
