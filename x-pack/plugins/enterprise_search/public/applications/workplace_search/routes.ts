/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { generatePath } from 'react-router-dom';

import { CURRENT_MAJOR_VERSION } from '../../../common/version';
import { ENT_SEARCH_DOCS_PREFIX } from '../shared/constants';

export const SETUP_GUIDE_PATH = '/setup_guide';

export const NOT_FOUND_PATH = '/404';

export const LEAVE_FEEDBACK_EMAIL = 'support@elastic.co';
export const LEAVE_FEEDBACK_URL = `mailto:${LEAVE_FEEDBACK_EMAIL}?Subject=Elastic%20Workplace%20Search%20Feedback`;

export const DOCS_PREFIX = `https://www.elastic.co/guide/en/workplace-search/${CURRENT_MAJOR_VERSION}`;
export const DOCUMENT_PERMISSIONS_DOCS_URL = `${DOCS_PREFIX}/workplace-search-sources-document-permissions.html`;
export const DOCUMENT_PERMISSIONS_SYNC_DOCS_URL = `${DOCUMENT_PERMISSIONS_DOCS_URL}#sources-permissions-synchronizing`;
export const PRIVATE_SOURCES_DOCS_URL = `${DOCUMENT_PERMISSIONS_DOCS_URL}#sources-permissions-org-private`;
export const EXTERNAL_IDENTITIES_DOCS_URL = `${DOCS_PREFIX}/workplace-search-external-identities-api.html`;
export const SECURITY_DOCS_URL = `${DOCS_PREFIX}/workplace-search-security.html`;
export const SMTP_DOCS_URL = `${DOCS_PREFIX}/workplace-search-smtp-mailer.html`;
export const BOX_DOCS_URL = `${DOCS_PREFIX}/workplace-search-box-connector.html`;
export const CONFLUENCE_DOCS_URL = `${DOCS_PREFIX}/workplace-search-confluence-cloud-connector.html`;
export const CONFLUENCE_SERVER_DOCS_URL = `${DOCS_PREFIX}/workplace-search-confluence-server-connector.html`;
export const DROPBOX_DOCS_URL = `${DOCS_PREFIX}/workplace-search-dropbox-connector.html`;
export const GITHUB_DOCS_URL = `${DOCS_PREFIX}/workplace-search-github-connector.html`;
export const GITHUB_ENTERPRISE_DOCS_URL = `${DOCS_PREFIX}/workplace-search-github-connector.html`;
export const GMAIL_DOCS_URL = `${DOCS_PREFIX}/workplace-search-gmail-connector.html`;
export const GOOGLE_DRIVE_DOCS_URL = `${DOCS_PREFIX}/workplace-search-google-drive-connector.html`;
export const JIRA_DOCS_URL = `${DOCS_PREFIX}/workplace-search-jira-cloud-connector.html`;
export const JIRA_SERVER_DOCS_URL = `${DOCS_PREFIX}/workplace-search-jira-server-connector.html`;
export const ONEDRIVE_DOCS_URL = `${DOCS_PREFIX}/workplace-search-onedrive-connector.html`;
export const SALESFORCE_DOCS_URL = `${DOCS_PREFIX}/workplace-search-salesforce-connector.html`;
export const SERVICENOW_DOCS_URL = `${DOCS_PREFIX}/workplace-search-servicenow-connector.html`;
export const SHAREPOINT_DOCS_URL = `${DOCS_PREFIX}/workplace-search-sharepoint-online-connector.html`;
export const SLACK_DOCS_URL = `${DOCS_PREFIX}/workplace-search-slack-connector.html`;
export const ZENDESK_DOCS_URL = `${DOCS_PREFIX}/workplace-search-zendesk-connector.html`;
export const CUSTOM_SOURCE_DOCS_URL = `${DOCS_PREFIX}/workplace-search-custom-api-sources.html`;
export const CUSTOM_API_DOCS_URL = `${DOCS_PREFIX}/workplace-search-custom-sources-api.html`;
export const CUSTOM_API_DOCUMENT_PERMISSIONS_DOCS_URL = `${CUSTOM_SOURCE_DOCS_URL}#custom-api-source-document-level-access-control`;
export const ENT_SEARCH_LICENSE_MANAGEMENT = `${ENT_SEARCH_DOCS_PREFIX}/license-management.html`;

export const PERSONAL_PATH = '/p';

export const ROLE_MAPPINGS_PATH = '/role-mappings';
export const ROLE_MAPPING_PATH = `${ROLE_MAPPINGS_PATH}/:roleId`;
export const ROLE_MAPPING_NEW_PATH = `${ROLE_MAPPINGS_PATH}/new`;

export const USERS_PATH = '/users';
export const SECURITY_PATH = '/security';

export const GROUPS_PATH = '/groups';
export const GROUP_PATH = `${GROUPS_PATH}/:groupId`;
export const GROUP_SOURCE_PRIORITIZATION_PATH = `${GROUPS_PATH}/:groupId/source_prioritization`;

export const SOURCES_PATH = '/sources';
export const PERSONAL_SOURCES_PATH = `${PERSONAL_PATH}${SOURCES_PATH}`;

export const SOURCE_ADDED_PATH = `${SOURCES_PATH}/added`;
export const ADD_SOURCE_PATH = `${SOURCES_PATH}/add`;
export const ADD_BOX_PATH = `${SOURCES_PATH}/add/box`;
export const ADD_CONFLUENCE_PATH = `${SOURCES_PATH}/add/confluence-cloud`;
export const ADD_CONFLUENCE_SERVER_PATH = `${SOURCES_PATH}/add/confluence-server`;
export const ADD_DROPBOX_PATH = `${SOURCES_PATH}/add/dropbox`;
export const ADD_GITHUB_ENTERPRISE_PATH = `${SOURCES_PATH}/add/github-enterprise-server`;
export const ADD_GITHUB_PATH = `${SOURCES_PATH}/add/github`;
export const ADD_GMAIL_PATH = `${SOURCES_PATH}/add/gmail`;
export const ADD_GOOGLE_DRIVE_PATH = `${SOURCES_PATH}/add/google-drive`;
export const ADD_JIRA_PATH = `${SOURCES_PATH}/add/jira-cloud`;
export const ADD_JIRA_SERVER_PATH = `${SOURCES_PATH}/add/jira-server`;
export const ADD_ONEDRIVE_PATH = `${SOURCES_PATH}/add/onedrive`;
export const ADD_SALESFORCE_PATH = `${SOURCES_PATH}/add/salesforce`;
export const ADD_SALESFORCE_SANDBOX_PATH = `${SOURCES_PATH}/add/salesforce-sandbox`;
export const ADD_SERVICENOW_PATH = `${SOURCES_PATH}/add/servicenow`;
export const ADD_SHAREPOINT_PATH = `${SOURCES_PATH}/add/sharepoint`;
export const ADD_SLACK_PATH = `${SOURCES_PATH}/add/slack`;
export const ADD_ZENDESK_PATH = `${SOURCES_PATH}/add/zendesk`;
export const ADD_CUSTOM_PATH = `${SOURCES_PATH}/add/custom`;

export const PERSONAL_SETTINGS_PATH = `${PERSONAL_PATH}/settings`;

export const SOURCE_DETAILS_PATH = `${SOURCES_PATH}/:sourceId`;
export const SOURCE_CONTENT_PATH = `${SOURCES_PATH}/:sourceId/content`;
export const SOURCE_SCHEMAS_PATH = `${SOURCES_PATH}/:sourceId/schemas`;
export const SOURCE_DISPLAY_SETTINGS_PATH = `${SOURCES_PATH}/:sourceId/display-settings`;
export const SOURCE_SETTINGS_PATH = `${SOURCES_PATH}/:sourceId/settings`;
export const REINDEX_JOB_PATH = `${SOURCES_PATH}/:sourceId/schema-errors/:activeReindexJobId`;

export const DISPLAY_SETTINGS_SEARCH_RESULT_PATH = `${SOURCE_DISPLAY_SETTINGS_PATH}/`;
export const DISPLAY_SETTINGS_RESULT_DETAIL_PATH = `${SOURCE_DISPLAY_SETTINGS_PATH}/result-detail`;

export const ORG_SETTINGS_PATH = '/settings';
export const ORG_SETTINGS_CUSTOMIZE_PATH = `${ORG_SETTINGS_PATH}/customize`;
export const ORG_SETTINGS_CONNECTORS_PATH = `${ORG_SETTINGS_PATH}/connectors`;
export const ORG_SETTINGS_OAUTH_APPLICATION_PATH = `${ORG_SETTINGS_PATH}/oauth`;
export const EDIT_BOX_PATH = `${ORG_SETTINGS_CONNECTORS_PATH}/box/edit`;
export const EDIT_CONFLUENCE_PATH = `${ORG_SETTINGS_CONNECTORS_PATH}/confluence-cloud/edit`;
export const EDIT_CONFLUENCE_SERVER_PATH = `${ORG_SETTINGS_CONNECTORS_PATH}/confluence-server/edit`;
export const EDIT_DROPBOX_PATH = `${ORG_SETTINGS_CONNECTORS_PATH}/dropbox/edit`;
export const EDIT_GITHUB_ENTERPRISE_PATH = `${ORG_SETTINGS_CONNECTORS_PATH}/github-enterprise-server/edit`;
export const EDIT_GITHUB_PATH = `${ORG_SETTINGS_CONNECTORS_PATH}/github/edit`;
export const EDIT_GMAIL_PATH = `${ORG_SETTINGS_CONNECTORS_PATH}/gmail/edit`;
export const EDIT_GOOGLE_DRIVE_PATH = `${ORG_SETTINGS_CONNECTORS_PATH}/google-drive/edit`;
export const EDIT_JIRA_PATH = `${ORG_SETTINGS_CONNECTORS_PATH}/jira-cloud/edit`;
export const EDIT_JIRA_SERVER_PATH = `${ORG_SETTINGS_CONNECTORS_PATH}/jira-server/edit`;
export const EDIT_ONEDRIVE_PATH = `${ORG_SETTINGS_CONNECTORS_PATH}/onedrive/edit`;
export const EDIT_SALESFORCE_PATH = `${ORG_SETTINGS_CONNECTORS_PATH}/salesforce/edit`;
export const EDIT_SALESFORCE_SANDBOX_PATH = `${ORG_SETTINGS_CONNECTORS_PATH}/salesforce-sandbox/edit`;
export const EDIT_SERVICENOW_PATH = `${ORG_SETTINGS_CONNECTORS_PATH}/servicenow/edit`;
export const EDIT_SHAREPOINT_PATH = `${ORG_SETTINGS_CONNECTORS_PATH}/sharepoint/edit`;
export const EDIT_SLACK_PATH = `${ORG_SETTINGS_CONNECTORS_PATH}/slack/edit`;
export const EDIT_ZENDESK_PATH = `${ORG_SETTINGS_CONNECTORS_PATH}/zendesk/edit`;
export const EDIT_CUSTOM_PATH = `${ORG_SETTINGS_CONNECTORS_PATH}/custom/edit`;

export const getContentSourcePath = (
  path: string,
  sourceId: string,
  isOrganization: boolean
): string => generatePath(isOrganization ? path : `${PERSONAL_PATH}${path}`, { sourceId });
export const getGroupPath = (groupId: string): string => generatePath(GROUP_PATH, { groupId });
export const getGroupSourcePrioritizationPath = (groupId: string): string =>
  `${GROUPS_PATH}/${groupId}/source_prioritization`;
export const getSourcesPath = (path: string, isOrganization: boolean): string =>
  isOrganization ? path : `${PERSONAL_PATH}${path}`;
