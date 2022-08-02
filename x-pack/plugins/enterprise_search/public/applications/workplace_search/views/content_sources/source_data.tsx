/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

import { docLinks } from '../../../shared/doc_links';

import {
  SOURCE_CATEGORIES,
  SOURCE_NAMES,
  SOURCE_OBJ_TYPES,
  GITHUB_LINK_TITLE,
} from '../../constants';
import { FeatureIds, SourceDataItem } from '../../types';

export const staticGenericExternalSourceData: SourceDataItem = {
  name: SOURCE_NAMES.CUSTOM_CONNECTOR_PACKAGE,
  categories: ['API', 'Custom'],
  serviceType: 'external',
  configuration: {
    hasOauthRedirect: false,
    needsBaseUrl: false,
    documentationUrl: docLinks.workplaceSearchCustomConnectorPackage,
    applicationPortalUrl: '',
  },
  objTypes: [],
  features: {
    basicOrgContext: [FeatureIds.SyncFrequency, FeatureIds.GlobalAccessPermissions],
    platinumOrgContext: [],
    platinumPrivateContext: [],
  },
  accountContextOnly: false,
  isBeta: true,
};

export const staticSourceData: SourceDataItem[] = [
  {
    name: SOURCE_NAMES.BOX,
    serviceType: 'box',
    categories: [
      SOURCE_CATEGORIES.FILE_SHARING,
      SOURCE_CATEGORIES.STORAGE,
      SOURCE_CATEGORIES.CLOUD,
    ],
    configuration: {
      hasOauthRedirect: true,
      needsBaseUrl: false,
      documentationUrl: docLinks.workplaceSearchBox,
      applicationPortalUrl: 'https://app.box.com/developers/console',
    },
    objTypes: [SOURCE_OBJ_TYPES.FOLDERS, SOURCE_OBJ_TYPES.ALL_FILES],
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
    name: SOURCE_NAMES.CONFLUENCE,
    serviceType: 'confluence_cloud',
    categories: [SOURCE_CATEGORIES.WIKI, SOURCE_CATEGORIES.ATLASSIAN, SOURCE_CATEGORIES.INTRANET],
    configuration: {
      hasOauthRedirect: true,
      needsBaseUrl: true,
      documentationUrl: docLinks.workplaceSearchConfluenceCloud,
      applicationPortalUrl: 'https://developer.atlassian.com/console/myapps/',
    },
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
    name: SOURCE_NAMES.CONFLUENCE_CONNECTOR_PACKAGE,
    serviceType: 'external',
    baseServiceType: 'confluence_cloud',
    categories: [SOURCE_CATEGORIES.WIKI, SOURCE_CATEGORIES.ATLASSIAN, SOURCE_CATEGORIES.INTRANET],
    configuration: {
      hasOauthRedirect: true,
      needsBaseUrl: true,
      documentationUrl: docLinks.workplaceSearchConfluenceCloudConnectorPackage,
      applicationPortalUrl: 'https://developer.atlassian.com/console/myapps/',
    },
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
      basicOrgContextExcludedFeatures: [FeatureIds.DocumentLevelPermissions],
      platinumOrgContext: [FeatureIds.SyncFrequency, FeatureIds.SyncedItems],
      platinumPrivateContext: [
        FeatureIds.Private,
        FeatureIds.SyncFrequency,
        FeatureIds.SyncedItems,
      ],
    },
    accountContextOnly: false,
    isBeta: true,
  },
  {
    name: SOURCE_NAMES.CONFLUENCE_SERVER,
    serviceType: 'confluence_server',
    categories: [SOURCE_CATEGORIES.WIKI, SOURCE_CATEGORIES.ATLASSIAN, SOURCE_CATEGORIES.INTRANET],
    configuration: {
      hasOauthRedirect: true,
      needsBaseUrl: true,
      documentationUrl: docLinks.workplaceSearchConfluenceServer,
    },
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
    name: SOURCE_NAMES.DROPBOX,
    serviceType: 'dropbox',
    categories: [
      SOURCE_CATEGORIES.FILE_SHARING,
      SOURCE_CATEGORIES.STORAGE,
      SOURCE_CATEGORIES.CLOUD,
    ],
    configuration: {
      hasOauthRedirect: true,
      needsBaseUrl: false,
      documentationUrl: docLinks.workplaceSearchDropbox,
      applicationPortalUrl: 'https://www.dropbox.com/developers/apps',
    },
    objTypes: [SOURCE_OBJ_TYPES.FOLDERS, SOURCE_OBJ_TYPES.ALL_FILES],
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
    name: SOURCE_NAMES.GITHUB,
    serviceType: 'github',
    categories: [
      SOURCE_CATEGORIES.SOFTWARE,
      SOURCE_CATEGORIES.VERSION_CONTROL,
      SOURCE_CATEGORIES.CODE_REPOSITORY,
    ],
    configuration: {
      hasOauthRedirect: true,
      needsBaseUrl: false,
      needsConfiguration: true,
      documentationUrl: docLinks.workplaceSearchGitHub,
      applicationPortalUrl: 'https://github.com/settings/developers',
      applicationLinkTitle: GITHUB_LINK_TITLE,
    },
    objTypes: [
      SOURCE_OBJ_TYPES.ISSUES,
      SOURCE_OBJ_TYPES.PULL_REQUESTS,
      SOURCE_OBJ_TYPES.REPOSITORY_LIST,
      SOURCE_OBJ_TYPES.FILES,
    ],
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
    name: SOURCE_NAMES.GITHUB_ENTERPRISE,
    serviceType: 'github_enterprise_server',
    categories: [
      SOURCE_CATEGORIES.SOFTWARE,
      SOURCE_CATEGORIES.VERSION_CONTROL,
      SOURCE_CATEGORIES.CODE_REPOSITORY,
    ],
    configuration: {
      hasOauthRedirect: true,
      needsConfiguration: true,
      needsBaseUrl: true,
      baseUrlTitle: i18n.translate(
        'xpack.enterpriseSearch.workplaceSearch.sources.baseUrlTitles.github',
        {
          defaultMessage: 'GitHub Enterprise URL',
        }
      ),
      documentationUrl: docLinks.workplaceSearchGitHub,
      applicationPortalUrl: 'https://github.com/settings/developers',
      applicationLinkTitle: GITHUB_LINK_TITLE,
    },
    objTypes: [
      SOURCE_OBJ_TYPES.ISSUES,
      SOURCE_OBJ_TYPES.PULL_REQUESTS,
      SOURCE_OBJ_TYPES.REPOSITORY_LIST,
      SOURCE_OBJ_TYPES.FILES,
    ],
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
    name: SOURCE_NAMES.GMAIL,
    serviceType: 'gmail',
    categories: [
      SOURCE_CATEGORIES.COMMUNICATION,
      SOURCE_CATEGORIES.EMAIL,
      SOURCE_CATEGORIES.GOOGLE,
    ],
    configuration: {
      hasOauthRedirect: true,
      needsBaseUrl: false,
      documentationUrl: docLinks.workplaceSearchGmail,
      applicationPortalUrl: 'https://console.developers.google.com/',
    },
    objTypes: [SOURCE_OBJ_TYPES.EMAILS],
    features: {
      platinumPrivateContext: [FeatureIds.Remote, FeatureIds.Private, FeatureIds.SearchableContent],
    },
    accountContextOnly: true,
  },
  {
    name: SOURCE_NAMES.GOOGLE_DRIVE,
    serviceType: 'google_drive',
    categories: [
      SOURCE_CATEGORIES.FILE_SHARING,
      SOURCE_CATEGORIES.STORAGE,
      SOURCE_CATEGORIES.CLOUD,
      SOURCE_CATEGORIES.PRODUCTIVITY,
      SOURCE_CATEGORIES.GSUITE,
    ],
    configuration: {
      hasOauthRedirect: true,
      needsBaseUrl: false,
      documentationUrl: docLinks.workplaceSearchGoogleDrive,
      applicationPortalUrl: 'https://console.developers.google.com/',
    },
    objTypes: [
      SOURCE_OBJ_TYPES.FOLDERS,
      SOURCE_OBJ_TYPES.G_SUITE_FILES,
      SOURCE_OBJ_TYPES.ALL_STORED_FILES,
    ],
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
    name: SOURCE_NAMES.JIRA,
    serviceType: 'jira_cloud',
    categories: [
      SOURCE_CATEGORIES.SOFTWARE,
      SOURCE_CATEGORIES.BUG_TRACKING,
      SOURCE_CATEGORIES.ATLASSIAN,
      SOURCE_CATEGORIES.PROJECT_MANAGEMENT,
    ],
    configuration: {
      hasOauthRedirect: true,
      needsBaseUrl: true,
      documentationUrl: docLinks.workplaceSearchJiraCloud,
      applicationPortalUrl: 'https://developer.atlassian.com/console/myapps/',
    },
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
    name: SOURCE_NAMES.JIRA_SERVER,
    serviceType: 'jira_server',
    categories: [
      SOURCE_CATEGORIES.SOFTWARE,
      SOURCE_CATEGORIES.BUG_TRACKING,
      SOURCE_CATEGORIES.ATLASSIAN,
      SOURCE_CATEGORIES.PROJECT_MANAGEMENT,
    ],
    configuration: {
      hasOauthRedirect: true,
      needsBaseUrl: true,
      documentationUrl: docLinks.workplaceSearchJiraServer,
      applicationPortalUrl: '',
    },
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
    name: SOURCE_NAMES.NETWORK_DRVE,
    categories: [SOURCE_CATEGORIES.STORAGE],
    serviceType: 'custom',
    baseServiceType: 'network_drive',
    configuration: {
      hasOauthRedirect: false,
      needsBaseUrl: false,
      documentationUrl: docLinks.workplaceSearchNetworkDrive,
      applicationPortalUrl: '',
      githubRepository: 'elastic/enterprise-search-network-drive-connector',
    },
    accountContextOnly: false,
  },
  {
    name: SOURCE_NAMES.ONEDRIVE,
    serviceType: 'one_drive',
    categories: [
      SOURCE_CATEGORIES.FILE_SHARING,
      SOURCE_CATEGORIES.CLOUD,
      SOURCE_CATEGORIES.STORAGE,
      SOURCE_CATEGORIES.MICROSOFT,
      SOURCE_CATEGORIES.OFFICE_365,
    ],
    configuration: {
      hasOauthRedirect: true,
      needsBaseUrl: false,
      documentationUrl: docLinks.workplaceSearchOneDrive,
      applicationPortalUrl: 'https://portal.azure.com/',
    },
    objTypes: [SOURCE_OBJ_TYPES.FOLDERS, SOURCE_OBJ_TYPES.ALL_FILES],
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
    name: SOURCE_NAMES.SALESFORCE,
    serviceType: 'salesforce',
    categories: [
      SOURCE_CATEGORIES.CRM,
      SOURCE_CATEGORIES.CUSTOMER_RELATIONSHIP_MANAGEMENT,
      SOURCE_CATEGORIES.ACCOUNT_MANAGEMENT,
    ],
    configuration: {
      hasOauthRedirect: true,
      needsBaseUrl: false,
      documentationUrl: docLinks.workplaceSearchSalesforce,
      applicationPortalUrl: 'https://salesforce.com/',
    },
    objTypes: [
      SOURCE_OBJ_TYPES.CONTACTS,
      SOURCE_OBJ_TYPES.OPPORTUNITIES,
      SOURCE_OBJ_TYPES.LEADS,
      SOURCE_OBJ_TYPES.ACCOUNTS,
      SOURCE_OBJ_TYPES.ATTACHMENTS,
      SOURCE_OBJ_TYPES.CAMPAIGNS,
      SOURCE_OBJ_TYPES.CASES,
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
    name: SOURCE_NAMES.SALESFORCE_SANDBOX,
    serviceType: 'salesforce_sandbox',
    categories: [
      SOURCE_CATEGORIES.CRM,
      SOURCE_CATEGORIES.CUSTOMER_RELATIONSHIP_MANAGEMENT,
      SOURCE_CATEGORIES.ACCOUNT_MANAGEMENT,
    ],
    configuration: {
      hasOauthRedirect: true,
      needsBaseUrl: false,
      documentationUrl: docLinks.workplaceSearchSalesforce,
      applicationPortalUrl: 'https://test.salesforce.com/',
    },
    objTypes: [
      SOURCE_OBJ_TYPES.CONTACTS,
      SOURCE_OBJ_TYPES.OPPORTUNITIES,
      SOURCE_OBJ_TYPES.LEADS,
      SOURCE_OBJ_TYPES.ACCOUNTS,
      SOURCE_OBJ_TYPES.ATTACHMENTS,
      SOURCE_OBJ_TYPES.CAMPAIGNS,
      SOURCE_OBJ_TYPES.CASES,
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
    name: SOURCE_NAMES.SERVICENOW,
    serviceType: 'service_now',
    categories: [SOURCE_CATEGORIES.WORKFLOW],
    configuration: {
      hasOauthRedirect: false,
      needsBaseUrl: true,
      needsCredentials: true,
      documentationUrl: docLinks.workplaceSearchServiceNow,
      applicationPortalUrl: 'https://www.servicenow.com/my-account/sign-in.html',
    },
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
    name: SOURCE_NAMES.SHAREPOINT,
    serviceType: 'share_point',
    categories: [
      SOURCE_CATEGORIES.FILE_SHARING,
      SOURCE_CATEGORIES.STORAGE,
      SOURCE_CATEGORIES.CLOUD,
      SOURCE_CATEGORIES.MICROSOFT,
      SOURCE_CATEGORIES.OFFICE_365,
    ],
    configuration: {
      hasOauthRedirect: true,
      needsBaseUrl: false,
      documentationUrl: docLinks.workplaceSearchSharePoint,
      applicationPortalUrl: 'https://portal.azure.com/',
    },
    objTypes: [SOURCE_OBJ_TYPES.FOLDERS, SOURCE_OBJ_TYPES.SITES, SOURCE_OBJ_TYPES.ALL_FILES],
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
    name: SOURCE_NAMES.SHAREPOINT_CONNECTOR_PACKAGE,
    serviceType: 'external',
    baseServiceType: 'share_point',
    categories: [
      SOURCE_CATEGORIES.FILE_SHARING,
      SOURCE_CATEGORIES.STORAGE,
      SOURCE_CATEGORIES.CLOUD,
      SOURCE_CATEGORIES.MICROSOFT,
      SOURCE_CATEGORIES.OFFICE_365,
    ],
    configuration: {
      hasOauthRedirect: true,
      needsBaseUrl: false,
      documentationUrl: docLinks.workplaceSearchExternalSharePointOnline,
      applicationPortalUrl: 'https://portal.azure.com/',
    },
    objTypes: [SOURCE_OBJ_TYPES.ALL_STORED_FILES],
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
    isBeta: true,
  },
  {
    name: SOURCE_NAMES.SHAREPOINT_SERVER,
    categories: [
      SOURCE_CATEGORIES.FILE_SHARING,
      SOURCE_CATEGORIES.STORAGE,
      SOURCE_CATEGORIES.CLOUD,
      SOURCE_CATEGORIES.MICROSOFT,
      SOURCE_CATEGORIES.OFFICE_365,
    ],
    serviceType: 'custom',
    baseServiceType: 'share_point_server',
    configuration: {
      hasOauthRedirect: false,
      needsBaseUrl: false,
      documentationUrl: docLinks.workplaceSearchSharePointServer,
      applicationPortalUrl: '',
      githubRepository: 'elastic/enterprise-search-sharepoint-server-connector',
    },
    accountContextOnly: false,
  },
  {
    name: SOURCE_NAMES.SLACK,
    serviceType: 'slack',
    categories: [
      SOURCE_CATEGORIES.COLLABORATION,
      SOURCE_CATEGORIES.COMMUNICATION,
      SOURCE_CATEGORIES.INSTANT_MESSAGING,
      SOURCE_CATEGORIES.CHAT,
    ],
    configuration: {
      hasOauthRedirect: true,
      needsBaseUrl: false,
      documentationUrl: docLinks.workplaceSearchSlack,
      applicationPortalUrl: 'https://api.slack.com/apps/',
    },
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
    name: SOURCE_NAMES.ZENDESK,
    serviceType: 'zendesk',
    categories: [
      SOURCE_CATEGORIES.HELP,
      SOURCE_CATEGORIES.CUSTOMER_SERVICE,
      SOURCE_CATEGORIES.CUSTOMER_RELATIONSHIP_MANAGEMENT,
      SOURCE_CATEGORIES.TICKETING,
      SOURCE_CATEGORIES.HELPDESK,
    ],
    configuration: {
      hasOauthRedirect: true,
      needsBaseUrl: false,
      needsSubdomain: true,
      documentationUrl: docLinks.workplaceSearchZendesk,
      applicationPortalUrl: 'https://www.zendesk.com/login/',
    },
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
  staticGenericExternalSourceData,
];

export const staticCustomSourceData: SourceDataItem = {
  name: SOURCE_NAMES.CUSTOM,
  categories: ['API', 'Custom'],
  serviceType: 'custom',
  configuration: {
    hasOauthRedirect: false,
    needsBaseUrl: false,
    documentationUrl: docLinks.workplaceSearchCustomSources,
    applicationPortalUrl: '',
  },
  accountContextOnly: false,
};

export const getSourceData = (
  serviceType: string,
  baseServiceType?: string
): SourceDataItem | undefined => {
  if (serviceType === 'custom' && typeof baseServiceType === 'undefined') {
    return staticCustomSourceData;
  }
  return staticSourceData.find(
    (staticSource) =>
      staticSource.serviceType === serviceType && staticSource.baseServiceType === baseServiceType
  );
};

export const hasExternalConnectorOption = (serviceType: string): boolean =>
  !!getSourceData('external', serviceType);

export const hasCustomConnectorOption = (serviceType: string): boolean =>
  !!getSourceData('custom', serviceType);

export const hasMultipleConnectorOptions = (serviceType: string): boolean =>
  hasExternalConnectorOption(serviceType) || hasCustomConnectorOption(serviceType);
