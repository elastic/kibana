/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

import { UPDATE_BUTTON_LABEL, SAVE_BUTTON_LABEL, CANCEL_BUTTON_LABEL } from '../shared/constants';

export const WORKPLACE_SEARCH_TITLE = i18n.translate(
  'xpack.enterpriseSearch.workplaceSearch.title',
  {
    defaultMessage: 'Workplace Search',
  }
);

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
    defaultMessage: 'Users and roles',
  }),
  API_KEYS: i18n.translate('xpack.enterpriseSearch.workplaceSearch.nav.apiKeys', {
    defaultMessage: 'API keys',
  }),
  SECURITY: i18n.translate('xpack.enterpriseSearch.workplaceSearch.nav.security', {
    defaultMessage: 'Security',
  }),
  SCHEMA: i18n.translate('xpack.enterpriseSearch.workplaceSearch.nav.schema', {
    defaultMessage: 'Schema',
  }),
  SYNCHRONIZATION: i18n.translate('xpack.enterpriseSearch.workplaceSearch.nav.synchronization', {
    defaultMessage: 'Synchronization',
  }),
  SYNCHRONIZATION_FREQUENCY: i18n.translate(
    'xpack.enterpriseSearch.workplaceSearch.nav.synchronizationFrequency',
    {
      defaultMessage: 'Frequency',
    }
  ),
  SYNCHRONIZATION_ASSETS_AND_OBJECTS: i18n.translate(
    'xpack.enterpriseSearch.workplaceSearch.nav.synchronizationAssetsAndObjects',
    {
      defaultMessage: 'Assets and objects',
    }
  ),
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

export const ACCOUNT_NAV = {
  SOURCES: i18n.translate('xpack.enterpriseSearch.workplaceSearch.accountNav.sources.link', {
    defaultMessage: 'Content sources',
  }),
  ORG_DASHBOARD: i18n.translate(
    'xpack.enterpriseSearch.workplaceSearch.accountNav.orgDashboard.link',
    {
      defaultMessage: 'Go to organizational dashboard',
    }
  ),
  SEARCH: i18n.translate('xpack.enterpriseSearch.workplaceSearch.accountNav.search.link', {
    defaultMessage: 'Search',
  }),
  ACCOUNT: i18n.translate('xpack.enterpriseSearch.workplaceSearch.accountNav.account.link', {
    defaultMessage: 'My account',
  }),
  SETTINGS: i18n.translate('xpack.enterpriseSearch.workplaceSearch.accountNav.settings.link', {
    defaultMessage: 'Account settings',
  }),
  LOGOUT: i18n.translate('xpack.enterpriseSearch.workplaceSearch.accountNav.logout.link', {
    defaultMessage: 'Logout',
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
  SHAREPOINT_SERVER: i18n.translate(
    'xpack.enterpriseSearch.workplaceSearch.sources.sourceNames.sharePointServer',
    { defaultMessage: 'SharePoint Server' }
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
    defaultMessage: 'Issues (including comments)',
  }),
  PULL_REQUESTS: i18n.translate(
    'xpack.enterpriseSearch.workplaceSearch.sources.objTypes.pullRequests',
    {
      defaultMessage: 'Pull Requests (including comments)',
    }
  ),
  REPOSITORY_LIST: i18n.translate(
    'xpack.enterpriseSearch.workplaceSearch.sources.objTypes.repositoryList',
    {
      defaultMessage: 'Repository List',
    }
  ),
  FILES: i18n.translate('xpack.enterpriseSearch.workplaceSearch.sources.objTypes.files', {
    defaultMessage: 'Files (markdown only)',
  }),
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
  CASES: i18n.translate('xpack.enterpriseSearch.workplaceSearch.sources.objTypes.cases', {
    defaultMessage: 'Cases (including feeds and comments)',
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

export const API_KEYS_TITLE = i18n.translate(
  'xpack.enterpriseSearch.workplaceSearch.sources.apiKeysTitle',
  {
    defaultMessage: 'API keys',
  }
);

export const API_KEY_LABEL = i18n.translate(
  'xpack.enterpriseSearch.workplaceSearch.sources.apiKeyLabel',
  {
    defaultMessage: 'API key',
  }
);

export const GITHUB_LINK_TITLE = i18n.translate(
  'xpack.enterpriseSearch.workplaceSearch.sources.applicationLinkTitles.github',
  {
    defaultMessage: 'GitHub Developer Portal',
  }
);

export const GITHUB_VIA_APP_SERVICE_TYPE = 'github_via_app';
export const GITHUB_ENTERPRISE_SERVER_VIA_APP_SERVICE_TYPE = 'github_enterprise_server_via_app';

export const CUSTOM_SERVICE_TYPE = 'custom';
export const EXTERNAL_SERVICE_TYPE = 'external';

export const DOCUMENTATION_LINK_TITLE = i18n.translate(
  'xpack.enterpriseSearch.workplaceSearch.sources.documentation',
  {
    defaultMessage: 'Documentation',
  }
);

export const PRIVATE_SOURCES_DESCRIPTION = i18n.translate(
  'xpack.enterpriseSearch.workplaceSearch.security.privateSources.description',
  {
    defaultMessage:
      'Private sources are connected by users in your organization to create a personalized search experience.',
  }
);

export const PRIVATE_SOURCES_TOGGLE_DESCRIPTION = i18n.translate(
  'xpack.enterpriseSearch.workplaceSearch.security.privateSourcesToggle.description',
  {
    defaultMessage: 'Enable private sources for your organization',
  }
);

export const REMOTE_SOURCES_TOGGLE_TEXT = i18n.translate(
  'xpack.enterpriseSearch.workplaceSearch.security.remoteSourcesToggle.text',
  {
    defaultMessage: 'Enable remote private sources',
  }
);

export const REMOTE_SOURCES_TABLE_DESCRIPTION = i18n.translate(
  'xpack.enterpriseSearch.workplaceSearch.security.remoteSourcesTable.description',
  {
    defaultMessage:
      'Remote sources synchronize and store a limited amount of data on disk, with a low impact on storage resources.',
  }
);

export const REMOTE_SOURCES_EMPTY_TABLE_TITLE = i18n.translate(
  'xpack.enterpriseSearch.workplaceSearch.security.remoteSourcesEmptyTable.title',
  {
    defaultMessage: 'No remote private sources configured yet',
  }
);

export const STANDARD_SOURCES_TOGGLE_TEXT = i18n.translate(
  'xpack.enterpriseSearch.workplaceSearch.security.standardSourcesToggle.text',
  {
    defaultMessage: 'Enable standard private sources',
  }
);

export const STANDARD_SOURCES_TABLE_DESCRIPTION = i18n.translate(
  'xpack.enterpriseSearch.workplaceSearch.security.standardSourcesTable.description',
  {
    defaultMessage:
      'Standard sources synchronize and store all searchable data on disk, with a directly correlated impact on storage resources.',
  }
);

export const STANDARD_SOURCES_EMPTY_TABLE_TITLE = i18n.translate(
  'xpack.enterpriseSearch.workplaceSearch.security.standardSourcesEmptyTable.title',
  {
    defaultMessage: 'No standard private sources configured yet',
  }
);

export const SECURITY_UNSAVED_CHANGES_MESSAGE = i18n.translate(
  'xpack.enterpriseSearch.workplaceSearch.security.unsavedChanges.message',
  {
    defaultMessage:
      'Your private sources settings have not been saved. Are you sure you want to leave?',
  }
);

export const PRIVATE_SOURCES_UPDATE_CONFIRMATION_TEXT = i18n.translate(
  'xpack.enterpriseSearch.workplaceSearch.security.privateSourcesUpdateConfirmation.text',
  {
    defaultMessage: 'Updates to private source configuration will take effect immediately.',
  }
);

export const SOURCE_RESTRICTIONS_SUCCESS_MESSAGE = i18n.translate(
  'xpack.enterpriseSearch.workplaceSearch.security.sourceRestrictionsSuccess.message',
  {
    defaultMessage: 'Successfully updated source restrictions.',
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

export const EXTERNAL_CONNECTOR_URL_LABEL = i18n.translate(
  'xpack.enterpriseSearch.workplaceSearch.externalConnectorUrl.label',
  {
    defaultMessage: 'Connector URL',
  }
);

export const EXTERNAL_CONNECTOR_API_KEY_LABEL = i18n.translate(
  'xpack.enterpriseSearch.workplaceSearch.externalConnectorApiKey.label',
  {
    defaultMessage: 'Connector API key',
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

export const SAVE_SETTINGS_BUTTON = i18n.translate(
  'xpack.enterpriseSearch.workplaceSearch.saveSettings.button',
  {
    defaultMessage: 'Save settings',
  }
);

export const KEEP_EDITING_BUTTON = i18n.translate(
  'xpack.enterpriseSearch.workplaceSearch.keepEditing.button',
  {
    defaultMessage: 'Keep editing',
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

export const NON_PLATINUM_OAUTH_TITLE = i18n.translate(
  'xpack.enterpriseSearch.workplaceSearch.nonPlatinumOauthTitle',
  {
    defaultMessage: 'Configuring OAuth for Custom Search Applications',
  }
);

export const NON_PLATINUM_OAUTH_DESCRIPTION = i18n.translate(
  'xpack.enterpriseSearch.workplaceSearch.nonPlatinumOauthDescription',
  {
    defaultMessage:
      'Configure an OAuth application for secure use of the Workplace Search Search API. Upgrade to a Platinum license to enable the Search API and create your OAuth application.',
  }
);

export const EXPLORE_PLATINUM_FEATURES_LINK = i18n.translate(
  'xpack.enterpriseSearch.workplaceSearch.explorePlatinumFeatures.link',
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
    defaultMessage: 'Organization name',
  }
);

export const CUSTOMIZE_NAME_BUTTON = i18n.translate(
  'xpack.enterpriseSearch.workplaceSearch.customize.name.button',
  {
    defaultMessage: 'Save organization name',
  }
);

export const UPDATE_BUTTON = UPDATE_BUTTON_LABEL;
export const SAVE_BUTTON = SAVE_BUTTON_LABEL;
export const CANCEL_BUTTON = CANCEL_BUTTON_LABEL;

export const RESET_BUTTON = i18n.translate('xpack.enterpriseSearch.workplaceSearch.reset.button', {
  defaultMessage: 'Reset',
});

export const CONFIGURE_BUTTON = i18n.translate(
  'xpack.enterpriseSearch.workplaceSearch.configure.button',
  {
    defaultMessage: 'Configure',
  }
);

export const OK_BUTTON = i18n.translate('xpack.enterpriseSearch.workplaceSearch.ok.button', {
  defaultMessage: 'Ok',
});

export const PRIVATE_PLATINUM_LICENSE_CALLOUT = i18n.translate(
  'xpack.enterpriseSearch.workplaceSearch.privatePlatinumCallout.text',
  {
    defaultMessage: 'Private Sources require a Platinum license.',
  }
);

export const SOURCE = i18n.translate('xpack.enterpriseSearch.workplaceSearch.source.text', {
  defaultMessage: 'Source',
});

export const PRIVATE_SOURCE = i18n.translate(
  'xpack.enterpriseSearch.workplaceSearch.privateSource.text',
  {
    defaultMessage: 'Private Source',
  }
);

export const PRIVATE_SOURCES = i18n.translate(
  'xpack.enterpriseSearch.workplaceSearch.privateSources.text',
  {
    defaultMessage: 'Private Sources',
  }
);

export const PRIVATE_CAN_CREATE_PAGE_TITLE = i18n.translate(
  'xpack.enterpriseSearch.workplaceSearch.sources.private.canCreate.title',
  {
    defaultMessage: 'Manage private content sources',
  }
);

export const PRIVATE_VIEW_ONLY_PAGE_TITLE = i18n.translate(
  'xpack.enterpriseSearch.workplaceSearch.sources.private.vewOnly.title',
  {
    defaultMessage: 'Review Group Sources',
  }
);

export const PRIVATE_VIEW_ONLY_PAGE_DESCRIPTION = i18n.translate(
  'xpack.enterpriseSearch.workplaceSearch.sources.private.vewOnly.description',
  {
    defaultMessage: 'Review the status of all sources shared with your Group.',
  }
);

export const PRIVATE_CAN_CREATE_PAGE_DESCRIPTION = i18n.translate(
  'xpack.enterpriseSearch.workplaceSearch.sources.private.canCreate.description',
  {
    defaultMessage:
      'Review the status of all connected private sources, and manage private sources for your account.',
  }
);

export const ACCOUNT_SETTINGS_TITLE = i18n.translate(
  'xpack.enterpriseSearch.workplaceSearch.accountSettings.title',
  {
    defaultMessage: 'Account Settings',
  }
);

export const ACCOUNT_SETTINGS_DESCRIPTION = i18n.translate(
  'xpack.enterpriseSearch.workplaceSearch.accountSettings.description',
  {
    defaultMessage: 'Manage access, passwords, and other account settings.',
  }
);

export const CONFIRM_CHANGES_TEXT = i18n.translate(
  'xpack.enterpriseSearch.workplaceSearch.confirmChanges.text',
  {
    defaultMessage: 'Confirm changes',
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

export const URL_LABEL = i18n.translate('xpack.enterpriseSearch.workplaceSearch.url.label', {
  defaultMessage: 'URL',
});

export const FIELD_LABEL = i18n.translate('xpack.enterpriseSearch.workplaceSearch.field.label', {
  defaultMessage: 'Field',
});

export const LABEL_LABEL = i18n.translate('xpack.enterpriseSearch.workplaceSearch.label.label', {
  defaultMessage: 'Label',
});

export const DESCRIPTION_LABEL = i18n.translate(
  'xpack.enterpriseSearch.workplaceSearch.description.label',
  {
    defaultMessage: 'Description',
  }
);

export const BLOCK_LABEL = i18n.translate('xpack.enterpriseSearch.workplaceSearch.blockLabel', {
  defaultMessage: 'Block',
});

export const BETWEEN_LABEL = i18n.translate('xpack.enterpriseSearch.workplaceSearch.betweenLabel', {
  defaultMessage: 'between',
});

export const ON_LABEL = i18n.translate('xpack.enterpriseSearch.workplaceSearch.onLabel', {
  defaultMessage: 'on',
});

export const AND = i18n.translate('xpack.enterpriseSearch.workplaceSearch.and', {
  defaultMessage: 'and',
});

export const UPDATE_LABEL = i18n.translate('xpack.enterpriseSearch.workplaceSearch.update.label', {
  defaultMessage: 'Update',
});

export const ADD_LABEL = i18n.translate('xpack.enterpriseSearch.workplaceSearch.add.label', {
  defaultMessage: 'Add',
});

export const ADD_FIELD_LABEL = i18n.translate(
  'xpack.enterpriseSearch.workplaceSearch.addField.label',
  {
    defaultMessage: 'Add field',
  }
);

export const EDIT_FIELD_LABEL = i18n.translate(
  'xpack.enterpriseSearch.workplaceSearch.editField.label',
  {
    defaultMessage: 'Edit field',
  }
);

export const REMOVE_FIELD_LABEL = i18n.translate(
  'xpack.enterpriseSearch.workplaceSearch.removeField.label',
  {
    defaultMessage: 'Remove field',
  }
);

export const RECENT_ACTIVITY_TITLE = i18n.translate(
  'xpack.enterpriseSearch.workplaceSearch.recentActivity.title',
  {
    defaultMessage: 'Recent activity',
  }
);

export const CONFIRM_MODAL_TITLE = i18n.translate(
  'xpack.enterpriseSearch.workplaceSearch.comfirmModal.title',
  {
    defaultMessage: 'Please confirm',
  }
);

export const REMOVE_BUTTON = i18n.translate(
  'xpack.enterpriseSearch.workplaceSearch.remove.button',
  {
    defaultMessage: 'Remove',
  }
);

export const COPY_TEXT = i18n.translate('xpack.enterpriseSearch.workplaceSearch.copyText', {
  defaultMessage: 'Copy',
});

export const STATUS_POPOVER_TOOLTIP = i18n.translate(
  'xpack.enterpriseSearch.workplaceSearch.statusPopoverTooltip',
  {
    defaultMessage: 'Click to view info',
  }
);

export const DOCUMENTS_HEADER = i18n.translate(
  'xpack.enterpriseSearch.workplaceSearch.documentsHeader',
  {
    defaultMessage: 'Documents',
  }
);

export const SEARCHABLE_HEADER = i18n.translate(
  'xpack.enterpriseSearch.workplaceSearch.searchableHeader',
  {
    defaultMessage: 'Searchable',
  }
);

export const PLATINUM_FEATURE = i18n.translate(
  'xpack.enterpriseSearch.workplaceSearch.platinumFeature',
  {
    defaultMessage: 'Platinum feature',
  }
);

export const COPY_TOOLTIP = i18n.translate('xpack.enterpriseSearch.workplaceSearch.copy.tooltip', {
  defaultMessage: 'Copy to clipboard',
});

export const COPIED_TOOLTIP = i18n.translate(
  'xpack.enterpriseSearch.workplaceSearch.copied.tooltip',
  {
    defaultMessage: 'Copied!',
  }
);
