/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { i18n } from '@kbn/i18n';

import {
  ADD_CONFLUENCE_PATH,
  ADD_CONFLUENCE_SERVER_PATH,
  ADD_DROPBOX_PATH,
  ADD_GITHUB_ENTERPRISE_PATH,
  ADD_GITHUB_PATH,
  ADD_GMAIL_PATH,
  ADD_GOOGLE_DRIVE_PATH,
  ADD_JIRA_PATH,
  ADD_JIRA_SERVER_PATH,
  ADD_ONEDRIVE_PATH,
  ADD_SALESFORCE_PATH,
  ADD_SALESFORCE_SANDBOX_PATH,
  ADD_SERVICENOW_PATH,
  ADD_SHARE_POINT_PATH,
  ADD_SLACK_PATH,
  ADD_ZENDESK_PATH,
  ADD_CUSTOM_PATH,
  EDIT_CONFLUENCE_PATH,
  EDIT_CONFLUENCE_SERVER_PATH,
  EDIT_DROPBOX_PATH,
  EDIT_GITHUB_ENTERPRISE_PATH,
  EDIT_GITHUB_PATH,
  EDIT_GMAIL_PATH,
  EDIT_GOOGLE_DRIVE_PATH,
  EDIT_JIRA_PATH,
  EDIT_JIRA_SERVER_PATH,
  EDIT_ONEDRIVE_PATH,
  EDIT_SALESFORCE_PATH,
  EDIT_SALESFORCE_SANDBOX_PATH,
  EDIT_SERVICENOW_PATH,
  EDIT_SHARE_POINT_PATH,
  EDIT_SLACK_PATH,
  EDIT_ZENDESK_PATH,
  EDIT_CUSTOM_PATH,
  CONFLUENCE_DOCS_URL,
  CONFLUENCE_SERVER_DOCS_URL,
  GITHUB_ENTERPRISE_DOCS_URL,
  DROPBOX_DOCS_URL,
  GITHUB_DOCS_URL,
  GMAIL_DOCS_URL,
  GOOGLE_DRIVE_DOCS_URL,
  JIRA_DOCS_URL,
  JIRA_SERVER_DOCS_URL,
  ONEDRIVE_DOCS_URL,
  SALESFORCE_DOCS_URL,
  SERVICENOW_DOCS_URL,
  SHARE_POINT_DOCS_URL,
  SLACK_DOCS_URL,
  ZENDESK_DOCS_URL,
  CUSTOM_SOURCE_DOCS_URL,
} from '../../routes';

import { FeatureIds } from '../../types';

import { SOURCE_NAMES, SOURCE_OBJ_TYPES, GITHUB_LINK_TITLE } from '../../constants';

const connectStepDescription = {
  attachments: i18n.translate(
    'xpack.enterpriseSearch.workplaceSearch.sources.connectStepDescription.attachments',
    {
      defaultMessage:
        'Content found within Attachments (PDFs, Microsoft Office Files, and other popular textual file formats) will be automatically indexed and searchable.',
    }
  ),
  files: i18n.translate(
    'xpack.enterpriseSearch.workplaceSearch.sources.connectStepDescription.files',
    {
      defaultMessage:
        'Content found within PDFs, Microsoft Office Files, and other popular textual file formats will be automatically indexed and searchable.',
    }
  ),
  empty: '',
};

const sourceNames = {
  confluence: SOURCE_NAMES.CONFLUENCE,
  confluenceServer: SOURCE_NAMES.CONFLUENCE_SERVER,
  dropbox: SOURCE_NAMES.DROPBOX,
  github: SOURCE_NAMES.GITHUB,
  githubEnterprise: SOURCE_NAMES.GITHUB_ENTERPRISE,
  gmail: SOURCE_NAMES.GMAIL,
  googleDrive: SOURCE_NAMES.GOOGLE_DRIVE,
  jira: SOURCE_NAMES.JIRA,
  jiraServer: SOURCE_NAMES.JIRA_SERVER,
  oneDrive: SOURCE_NAMES.ONEDRIVE,
  salesforce: SOURCE_NAMES.SALESFORCE,
  salesforceSandbox: SOURCE_NAMES.SALESFORCE_SANDBOX,
  serviceNow: SOURCE_NAMES.SERVICENOW,
  sharePoint: SOURCE_NAMES.SHARE_POINT,
  slack: SOURCE_NAMES.SLACK,
  zendesk: SOURCE_NAMES.ZENDESK,
  custom: SOURCE_NAMES.CUSTOM,
};

export const staticSourceData = [
  {
    name: sourceNames.confluence,
    serviceType: 'confluence_cloud',
    addPath: ADD_CONFLUENCE_PATH,
    editPath: EDIT_CONFLUENCE_PATH,
    configuration: {
      isPublicKey: false,
      hasOauthRedirect: true,
      needsBaseUrl: true,
      documentationUrl: CONFLUENCE_DOCS_URL,
      applicationPortalUrl: 'https://developer.atlassian.com/apps/',
    },
    sourceDescription: i18n.translate(
      'xpack.enterpriseSearch.workplaceSearch.sources.sourceDescriptions.confluence',
      {
        defaultMessage:
          '{sourceName} is a team workspace, where knowledge and collaboration meet. Often used as an organizational wiki and intranet, it usually houses valuable information for staff across multiple areas of your business.',
        values: { sourceName: sourceNames.confluence },
      }
    ),
    connectStepDescription: connectStepDescription.attachments,
    objTypes: [
      SOURCE_OBJ_TYPES.PAGES,
      SOURCE_OBJ_TYPES.ATTACHMENTS,
      SOURCE_OBJ_TYPES.BLOG_POSTS,
      SOURCE_OBJ_TYPES.SPACES,
    ],
    features: {
      basicOrgContext: [
        FeatureIds.SyncFrequency,
        FeatureIds.SyncedItems,
        FeatureIds.GlobalAccessPermissions,
      ],
      platinumOrgContext: [FeatureIds.SyncFrequency, FeatureIds.SyncedItems],
      platinumPrivateContext: [
        FeatureIds.Private,
        FeatureIds.SyncFrequency,
        FeatureIds.SyncedItems,
      ],
    },
    accountContextOnly: false,
  },
  {
    name: sourceNames.confluenceServer,
    serviceType: 'confluence_server',
    addPath: ADD_CONFLUENCE_SERVER_PATH,
    editPath: EDIT_CONFLUENCE_SERVER_PATH,
    configuration: {
      isPublicKey: true,
      hasOauthRedirect: true,
      needsBaseUrl: false,
      documentationUrl: CONFLUENCE_SERVER_DOCS_URL,
    },
    sourceDescription: i18n.translate(
      'xpack.enterpriseSearch.workplaceSearch.sources.sourceDescriptions.confluenceServer',
      {
        defaultMessage:
          '{sourceName} is a team workspace, where knowledge and collaboration meet. Often used as an organizational wiki and intranet, it usually houses valuable information for staff across multiple areas of your business.',
        values: { sourceName: sourceNames.confluence },
      }
    ),
    connectStepDescription: connectStepDescription.attachments,
    objTypes: [
      SOURCE_OBJ_TYPES.PAGES,
      SOURCE_OBJ_TYPES.ATTACHMENTS,
      SOURCE_OBJ_TYPES.BLOG_POSTS,
      SOURCE_OBJ_TYPES.SPACES,
    ],
    features: {
      basicOrgContext: [
        FeatureIds.SyncFrequency,
        FeatureIds.SyncedItems,
        FeatureIds.GlobalAccessPermissions,
      ],
      platinumOrgContext: [FeatureIds.SyncFrequency, FeatureIds.SyncedItems],
      platinumPrivateContext: [
        FeatureIds.Private,
        FeatureIds.SyncFrequency,
        FeatureIds.SyncedItems,
      ],
    },
    accountContextOnly: false,
  },
  {
    name: sourceNames.dropbox,
    serviceType: 'dropbox',
    addPath: ADD_DROPBOX_PATH,
    editPath: EDIT_DROPBOX_PATH,
    configuration: {
      isPublicKey: false,
      hasOauthRedirect: true,
      needsBaseUrl: false,
      documentationUrl: DROPBOX_DOCS_URL,
      applicationPortalUrl: 'https://www.dropbox.com/developers/apps',
    },
    sourceDescription: i18n.translate(
      'xpack.enterpriseSearch.workplaceSearch.sources.sourceDescriptions.dropbox',
      {
        defaultMessage:
          '{sourceName} is a cloud-based storage service for organizations of all sizes. Create, store, share and automatically synchronize documents across your desktop and web.',
        values: { sourceName: sourceNames.dropbox },
      }
    ),
    connectStepDescription: connectStepDescription.files,
    objTypes: [SOURCE_OBJ_TYPES.ALL_FILES],
    features: {
      basicOrgContext: [
        FeatureIds.SyncFrequency,
        FeatureIds.SyncedItems,
        FeatureIds.GlobalAccessPermissions,
      ],
      platinumOrgContext: [FeatureIds.SyncFrequency, FeatureIds.SyncedItems],
      platinumPrivateContext: [
        FeatureIds.Private,
        FeatureIds.SyncFrequency,
        FeatureIds.SyncedItems,
      ],
    },
    accountContextOnly: false,
  },
  {
    name: sourceNames.github,
    serviceType: 'github',
    addPath: ADD_GITHUB_PATH,
    editPath: EDIT_GITHUB_PATH,
    configuration: {
      isPublicKey: false,
      hasOauthRedirect: true,
      needsBaseUrl: false,
      needsConfiguration: true,
      documentationUrl: GITHUB_DOCS_URL,
      applicationPortalUrl: 'https://github.com/settings/developers',
      applicationLinkTitle: GITHUB_LINK_TITLE,
    },
    sourceDescription: i18n.translate(
      'xpack.enterpriseSearch.workplaceSearch.sources.sourceDescriptions.github',
      {
        defaultMessage:
          '{sourceName} is a development platform, version control and collaboration platform for teams of all sizes. From open source to business, you can host and review code, manage projects, and build software across departments and continents.',
        values: { sourceName: sourceNames.github },
      }
    ),
    connectStepDescription: connectStepDescription.empty,
    objTypes: [
      SOURCE_OBJ_TYPES.ISSUES,
      SOURCE_OBJ_TYPES.PULL_REQUESTS,
      SOURCE_OBJ_TYPES.REPOSITORY_LIST,
    ],
    features: {
      basicOrgContext: [
        FeatureIds.SyncFrequency,
        FeatureIds.SyncedItems,
        FeatureIds.GlobalAccessPermissions,
      ],
      platinumOrgContext: [FeatureIds.SyncFrequency, FeatureIds.SyncedItems],
      platinumPrivateContext: [
        FeatureIds.Private,
        FeatureIds.SyncFrequency,
        FeatureIds.SyncedItems,
      ],
    },
    accountContextOnly: false,
  },
  {
    name: sourceNames.githubEnterprise,
    serviceType: 'github_enterprise_server',
    addPath: ADD_GITHUB_ENTERPRISE_PATH,
    editPath: EDIT_GITHUB_ENTERPRISE_PATH,
    configuration: {
      isPublicKey: false,
      hasOauthRedirect: true,
      needsConfiguration: true,
      needsBaseUrl: true,
      baseUrlTitle: i18n.translate(
        'xpack.enterpriseSearch.workplaceSearch.sources.baseUrlTitles.github',
        {
          defaultMessage: 'GitHub Enterprise URL',
        }
      ),
      documentationUrl: GITHUB_ENTERPRISE_DOCS_URL,
      applicationPortalUrl: 'https://github.com/settings/developers',
      applicationLinkTitle: GITHUB_LINK_TITLE,
    },
    sourceDescription: i18n.translate(
      'xpack.enterpriseSearch.workplaceSearch.sources.sourceDescriptions.githubEnterprise',
      {
        defaultMessage:
          '{sourceName} is a development platform, version control and collaboration platform for teams of all sizes. From open source to business, you can host and review code, manage projects, and build software across departments and continents.',
        values: { sourceName: sourceNames.githubEnterprise },
      }
    ),
    connectStepDescription: connectStepDescription.empty,
    objTypes: [
      SOURCE_OBJ_TYPES.ISSUES,
      SOURCE_OBJ_TYPES.PULL_REQUESTS,
      SOURCE_OBJ_TYPES.REPOSITORY_LIST,
    ],
    features: {
      basicOrgContext: [
        FeatureIds.SyncFrequency,
        FeatureIds.SyncedItems,
        FeatureIds.GlobalAccessPermissions,
      ],
      platinumOrgContext: [FeatureIds.SyncFrequency, FeatureIds.SyncedItems],
      platinumPrivateContext: [
        FeatureIds.Private,
        FeatureIds.SyncFrequency,
        FeatureIds.SyncedItems,
      ],
    },
    accountContextOnly: false,
  },
  {
    name: sourceNames.gmail,
    serviceType: 'gmail',
    addPath: ADD_GMAIL_PATH,
    editPath: EDIT_GMAIL_PATH,
    configuration: {
      isPublicKey: false,
      hasOauthRedirect: true,
      needsBaseUrl: false,
      documentationUrl: GMAIL_DOCS_URL,
      applicationPortalUrl: 'https://console.developers.google.com/',
    },
    sourceDescription: i18n.translate(
      'xpack.enterpriseSearch.workplaceSearch.sources.sourceDescriptions.gmail',
      {
        defaultMessage:
          '{sourceName} is a free email service developed by Google. It is fast, reliable, and trusted by millions of people and organizations around the world. Workplace Search brings all of your Gmail content into one relevant and ease-to-use search experience.',
        values: { sourceName: sourceNames.gmail },
      }
    ),
    connectStepDescription: connectStepDescription.empty,
    objTypes: [SOURCE_OBJ_TYPES.EMAILS],
    features: {
      platinumPrivateContext: [FeatureIds.Remote, FeatureIds.Private, FeatureIds.SearchableContent],
    },
    accountContextOnly: true,
  },
  {
    name: sourceNames.googleDrive,
    serviceType: 'google_drive',
    addPath: ADD_GOOGLE_DRIVE_PATH,
    editPath: EDIT_GOOGLE_DRIVE_PATH,
    configuration: {
      isPublicKey: false,
      hasOauthRedirect: true,
      needsBaseUrl: false,
      documentationUrl: GOOGLE_DRIVE_DOCS_URL,
      applicationPortalUrl: 'https://console.developers.google.com/',
    },
    sourceDescription: i18n.translate(
      'xpack.enterpriseSearch.workplaceSearch.sources.sourceDescriptions.googleDrive',
      {
        defaultMessage:
          '{sourceName} is a cloud-based storage and collaboration service for organizations of all sizes, with a focus on G Suite document (Google Docs, Sheets, Slides, etc) storage and collaboration. Create, store, share and automatically synchronize documents across your desktop and web.',
        values: { sourceName: sourceNames.googleDrive },
      }
    ),
    connectStepDescription: connectStepDescription.files,
    objTypes: [SOURCE_OBJ_TYPES.G_SUITE_FILES, SOURCE_OBJ_TYPES.ALL_STORED_FILES],
    features: {
      basicOrgContext: [
        FeatureIds.SyncFrequency,
        FeatureIds.SyncedItems,
        FeatureIds.GlobalAccessPermissions,
      ],
      basicOrgContextExcludedFeatures: [FeatureIds.DocumentLevelPermissions],
      platinumOrgContext: [FeatureIds.SyncFrequency, FeatureIds.SyncedItems],
      platinumPrivateContext: [
        FeatureIds.Private,
        FeatureIds.SyncFrequency,
        FeatureIds.SyncedItems,
      ],
    },
    accountContextOnly: false,
  },
  {
    name: sourceNames.jira,
    serviceType: 'jira_cloud',
    addPath: ADD_JIRA_PATH,
    editPath: EDIT_JIRA_PATH,
    configuration: {
      isPublicKey: true,
      hasOauthRedirect: true,
      needsBaseUrl: false,
      documentationUrl: JIRA_DOCS_URL,
      applicationPortalUrl: '',
    },
    sourceDescription: i18n.translate(
      'xpack.enterpriseSearch.workplaceSearch.sources.sourceDescriptions.jira',
      {
        defaultMessage:
          '{sourceName} is an issue tracking product that provides bug tracking, workflow automation, and agile project management tools for teams of all sizes. ',
        values: { sourceName: sourceNames.jira },
      }
    ),
    connectStepDescription: connectStepDescription.files,
    objTypes: [
      SOURCE_OBJ_TYPES.EPICS,
      SOURCE_OBJ_TYPES.PROJECTS,
      SOURCE_OBJ_TYPES.TASKS,
      SOURCE_OBJ_TYPES.STORIES,
      SOURCE_OBJ_TYPES.BUGS,
      SOURCE_OBJ_TYPES.ATTACHMENTS,
    ],
    features: {
      basicOrgContext: [
        FeatureIds.SyncFrequency,
        FeatureIds.SyncedItems,
        FeatureIds.GlobalAccessPermissions,
      ],
      platinumOrgContext: [FeatureIds.SyncFrequency, FeatureIds.SyncedItems],
      platinumPrivateContext: [
        FeatureIds.Private,
        FeatureIds.SyncFrequency,
        FeatureIds.SyncedItems,
      ],
    },
    accountContextOnly: false,
  },
  {
    name: sourceNames.jiraServer,
    serviceType: 'jira_server',
    addPath: ADD_JIRA_SERVER_PATH,
    editPath: EDIT_JIRA_SERVER_PATH,
    configuration: {
      isPublicKey: true,
      hasOauthRedirect: true,
      needsBaseUrl: false,
      documentationUrl: JIRA_SERVER_DOCS_URL,
      applicationPortalUrl: '',
    },
    sourceDescription: i18n.translate(
      'xpack.enterpriseSearch.workplaceSearch.sources.sourceDescriptions.jiraServer',
      {
        defaultMessage:
          '{sourceName} is an issue tracking product that provides bug tracking, workflow automation, and agile project management tools for teams of all sizes. ',
        values: { sourceName: sourceNames.jiraServer },
      }
    ),
    connectStepDescription: connectStepDescription.files,
    objTypes: [
      SOURCE_OBJ_TYPES.EPICS,
      SOURCE_OBJ_TYPES.PROJECTS,
      SOURCE_OBJ_TYPES.TASKS,
      SOURCE_OBJ_TYPES.STORIES,
      SOURCE_OBJ_TYPES.BUGS,
      SOURCE_OBJ_TYPES.ATTACHMENTS,
    ],
    features: {
      basicOrgContext: [
        FeatureIds.SyncFrequency,
        FeatureIds.SyncedItems,
        FeatureIds.GlobalAccessPermissions,
      ],
      platinumOrgContext: [FeatureIds.SyncFrequency, FeatureIds.SyncedItems],
      platinumPrivateContext: [
        FeatureIds.Private,
        FeatureIds.SyncFrequency,
        FeatureIds.SyncedItems,
      ],
    },
    accountContextOnly: false,
  },
  {
    name: sourceNames.oneDrive,
    serviceType: 'one_drive',
    addPath: ADD_ONEDRIVE_PATH,
    editPath: EDIT_ONEDRIVE_PATH,
    configuration: {
      isPublicKey: false,
      hasOauthRedirect: true,
      needsBaseUrl: false,
      documentationUrl: ONEDRIVE_DOCS_URL,
      applicationPortalUrl: 'https://portal.azure.com/',
    },
    sourceDescription: i18n.translate(
      'xpack.enterpriseSearch.workplaceSearch.sources.sourceDescriptions.oneDrive',
      {
        defaultMessage:
          '{sourceName} is a cloud-based storage service for organizations of all sizes, with a focus on Office 365 document storage and collaboration. Create, store, share and automatically synchronize documents across your organization.',
        values: { sourceName: sourceNames.oneDrive },
      }
    ),
    connectStepDescription: connectStepDescription.files,
    objTypes: [SOURCE_OBJ_TYPES.ALL_FILES],
    features: {
      basicOrgContext: [
        FeatureIds.SyncFrequency,
        FeatureIds.SyncedItems,
        FeatureIds.GlobalAccessPermissions,
      ],
      basicOrgContextExcludedFeatures: [FeatureIds.DocumentLevelPermissions],
      platinumOrgContext: [FeatureIds.SyncFrequency, FeatureIds.SyncedItems],
      platinumPrivateContext: [
        FeatureIds.Private,
        FeatureIds.SyncFrequency,
        FeatureIds.SyncedItems,
      ],
    },
    accountContextOnly: false,
  },
  {
    name: sourceNames.salesforce,
    serviceType: 'salesforce',
    addPath: ADD_SALESFORCE_PATH,
    editPath: EDIT_SALESFORCE_PATH,
    configuration: {
      isPublicKey: false,
      hasOauthRedirect: true,
      needsBaseUrl: false,
      documentationUrl: SALESFORCE_DOCS_URL,
      applicationPortalUrl: 'https://salesforce.com/',
    },
    sourceDescription: i18n.translate(
      'xpack.enterpriseSearch.workplaceSearch.sources.sourceDescriptions.salesforce',
      {
        defaultMessage:
          '{sourceName} is a cloud-based customer relationship management (CRM) platform with a focus on customer service, marketing automation, analytics, and sales operation tooling.',
        values: { sourceName: sourceNames.salesforce },
      }
    ),
    connectStepDescription: connectStepDescription.attachments,
    objTypes: [
      SOURCE_OBJ_TYPES.CONTACTS,
      SOURCE_OBJ_TYPES.OPPORTUNITIES,
      SOURCE_OBJ_TYPES.LEADS,
      SOURCE_OBJ_TYPES.ACCOUNTS,
      SOURCE_OBJ_TYPES.CAMPAIGNS,
    ],
    features: {
      basicOrgContext: [
        FeatureIds.SyncFrequency,
        FeatureIds.SyncedItems,
        FeatureIds.GlobalAccessPermissions,
      ],
      platinumOrgContext: [FeatureIds.SyncFrequency, FeatureIds.SyncedItems],
      platinumPrivateContext: [
        FeatureIds.Private,
        FeatureIds.SyncFrequency,
        FeatureIds.SyncedItems,
      ],
    },
    accountContextOnly: false,
  },
  {
    name: sourceNames.salesforceSandbox,
    serviceType: 'salesforce_sandbox',
    addPath: ADD_SALESFORCE_SANDBOX_PATH,
    editPath: EDIT_SALESFORCE_SANDBOX_PATH,
    configuration: {
      isPublicKey: false,
      hasOauthRedirect: true,
      needsBaseUrl: false,
      documentationUrl: SALESFORCE_DOCS_URL,
      applicationPortalUrl: 'https://test.salesforce.com/',
    },
    sourceDescription: i18n.translate(
      'xpack.enterpriseSearch.workplaceSearch.sources.sourceDescriptions.salesforceSandbox',
      {
        defaultMessage:
          '{sourceName} is a cloud-based customer relationship management (CRM) platform with a focus on customer service, marketing automation, analytics, and sales operation tooling.',
        values: { sourceName: sourceNames.salesforceSandbox },
      }
    ),
    connectStepDescription: connectStepDescription.attachments,
    objTypes: [
      SOURCE_OBJ_TYPES.CONTACTS,
      SOURCE_OBJ_TYPES.OPPORTUNITIES,
      SOURCE_OBJ_TYPES.LEADS,
      SOURCE_OBJ_TYPES.ACCOUNTS,
      SOURCE_OBJ_TYPES.CAMPAIGNS,
    ],
    features: {
      basicOrgContext: [
        FeatureIds.SyncFrequency,
        FeatureIds.SyncedItems,
        FeatureIds.GlobalAccessPermissions,
      ],
      platinumOrgContext: [FeatureIds.SyncFrequency, FeatureIds.SyncedItems],
      platinumPrivateContext: [
        FeatureIds.Private,
        FeatureIds.SyncFrequency,
        FeatureIds.SyncedItems,
      ],
    },
    accountContextOnly: false,
  },
  {
    name: sourceNames.serviceNow,
    serviceType: 'service_now',
    addPath: ADD_SERVICENOW_PATH,
    editPath: EDIT_SERVICENOW_PATH,
    configuration: {
      isPublicKey: false,
      hasOauthRedirect: false,
      needsBaseUrl: true,
      documentationUrl: SERVICENOW_DOCS_URL,
      applicationPortalUrl: 'https://www.servicenow.com/my-account/sign-in.html',
    },
    sourceDescription: i18n.translate(
      'xpack.enterpriseSearch.workplaceSearch.sources.sourceDescriptions.serviceNow',
      {
        defaultMessage:
          '{sourceName} is a cloud-based IT Service Management (ITSM) platform focusing on workflow automation and internal organizational support.',
        values: { sourceName: sourceNames.serviceNow },
      }
    ),
    connectStepDescription: connectStepDescription.empty,
    objTypes: [
      SOURCE_OBJ_TYPES.USERS,
      SOURCE_OBJ_TYPES.INCIDENTS,
      SOURCE_OBJ_TYPES.ITEMS,
      SOURCE_OBJ_TYPES.ARTICLES,
    ],
    features: {
      basicOrgContext: [
        FeatureIds.SyncFrequency,
        FeatureIds.SyncedItems,
        FeatureIds.GlobalAccessPermissions,
      ],
      platinumOrgContext: [FeatureIds.SyncFrequency, FeatureIds.SyncedItems],
      platinumPrivateContext: [
        FeatureIds.Private,
        FeatureIds.SyncFrequency,
        FeatureIds.SyncedItems,
      ],
    },
    accountContextOnly: false,
  },
  {
    name: sourceNames.sharePoint,
    serviceType: 'share_point',
    addPath: ADD_SHARE_POINT_PATH,
    editPath: EDIT_SHARE_POINT_PATH,
    configuration: {
      isPublicKey: false,
      hasOauthRedirect: true,
      needsBaseUrl: false,
      documentationUrl: SHARE_POINT_DOCS_URL,
      applicationPortalUrl: 'https://portal.azure.com/',
    },
    sourceDescription: i18n.translate(
      'xpack.enterpriseSearch.workplaceSearch.sources.sourceDescriptions.sharePoint',
      {
        defaultMessage:
          '{sourceName} is a cloud-based collaboration, knowledge management and storage platform for organizations of all sizes. Often used as a centralized content management system (CMS), SharePoint Online stores a wealth of information across departments and teams.',
        values: { sourceName: sourceNames.sharePoint },
      }
    ),
    connectStepDescription: connectStepDescription.files,
    objTypes: [SOURCE_OBJ_TYPES.SITES, SOURCE_OBJ_TYPES.ALL_FILES],
    features: {
      basicOrgContext: [
        FeatureIds.SyncFrequency,
        FeatureIds.SyncedItems,
        FeatureIds.GlobalAccessPermissions,
      ],
      basicOrgContextExcludedFeatures: [FeatureIds.DocumentLevelPermissions],
      platinumOrgContext: [FeatureIds.SyncFrequency, FeatureIds.SyncedItems],
      platinumPrivateContext: [
        FeatureIds.Private,
        FeatureIds.SyncFrequency,
        FeatureIds.SyncedItems,
      ],
    },
    accountContextOnly: false,
  },
  {
    name: sourceNames.slack,
    serviceType: 'slack',
    addPath: ADD_SLACK_PATH,
    editPath: EDIT_SLACK_PATH,
    configuration: {
      isPublicKey: false,
      hasOauthRedirect: true,
      needsBaseUrl: false,
      documentationUrl: SLACK_DOCS_URL,
      applicationPortalUrl: 'https://api.slack.com/apps/',
    },
    sourceDescription: i18n.translate(
      'xpack.enterpriseSearch.workplaceSearch.sources.sourceDescriptions.slack',
      {
        defaultMessage:
          '{sourceName} is a communication tool that enables real-time collaboration and decision making. With ${sourceNames.slack}, keep track of the work happening across teams, engage directly with your coworkers on ongoing projects and communicate with other organizations.',
        values: { sourceName: sourceNames.slack },
      }
    ),
    connectStepDescription: connectStepDescription.empty,
    objTypes: [
      SOURCE_OBJ_TYPES.PUBLIC_MESSAGES,
      SOURCE_OBJ_TYPES.PRIVATE_MESSAGES,
      SOURCE_OBJ_TYPES.DIRECT_MESSAGES,
    ],
    features: {
      platinumPrivateContext: [FeatureIds.Remote, FeatureIds.Private, FeatureIds.SearchableContent],
    },
    accountContextOnly: true,
  },
  {
    name: sourceNames.zendesk,
    serviceType: 'zendesk',
    addPath: ADD_ZENDESK_PATH,
    editPath: EDIT_ZENDESK_PATH,
    configuration: {
      isPublicKey: false,
      hasOauthRedirect: true,
      needsBaseUrl: false,
      needsSubdomain: true,
      documentationUrl: ZENDESK_DOCS_URL,
      applicationPortalUrl: 'https://www.zendesk.com/login/',
    },
    sourceDescription: i18n.translate(
      'xpack.enterpriseSearch.workplaceSearch.sources.sourceDescriptions.zendesk',
      {
        defaultMessage:
          '{sourceName} is cloud-based customer relationship management and customer support platform that provides tools for tracking, prioritizing, and solving customer support tickets.',
        values: { sourceName: sourceNames.zendesk },
      }
    ),
    connectStepDescription: connectStepDescription.empty,
    objTypes: [SOURCE_OBJ_TYPES.TICKETS],
    features: {
      basicOrgContext: [
        FeatureIds.SyncFrequency,
        FeatureIds.SyncedItems,
        FeatureIds.GlobalAccessPermissions,
      ],
      platinumOrgContext: [FeatureIds.SyncFrequency, FeatureIds.SyncedItems],
      platinumPrivateContext: [
        FeatureIds.Private,
        FeatureIds.SyncFrequency,
        FeatureIds.SyncedItems,
      ],
    },
    accountContextOnly: false,
  },
  {
    name: sourceNames.custom,
    serviceType: 'custom',
    addPath: ADD_CUSTOM_PATH,
    editPath: EDIT_CUSTOM_PATH,
    configuration: {
      isPublicKey: false,
      hasOauthRedirect: false,
      needsBaseUrl: false,
      helpText: i18n.translate('xpack.enterpriseSearch.workplaceSearch.sources.helpText.custom', {
        defaultMessage:
          'To create a Custom API Source, provide a human-readable and descriptive name. The name will appear as-is in the various search experiences and management interfaces.',
      }),
      documentationUrl: CUSTOM_SOURCE_DOCS_URL,
      applicationPortalUrl: '',
    },
    sourceDescription: '',
    connectStepDescription: connectStepDescription.empty,
    accountContextOnly: false,
  },
];
