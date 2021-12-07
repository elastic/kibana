/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { generatePath } from 'react-router-dom';

import {
  GITHUB_VIA_APP_SERVICE_TYPE,
  GITHUB_ENTERPRISE_SERVER_VIA_APP_SERVICE_TYPE,
} from './constants';

export const SETUP_GUIDE_PATH = '/setup_guide';

export const NOT_FOUND_PATH = '/404';
export const LOGOUT_ROUTE = '/logout';

export const LEAVE_FEEDBACK_EMAIL = 'support@elastic.co';
export const LEAVE_FEEDBACK_URL = `mailto:${LEAVE_FEEDBACK_EMAIL}?Subject=Elastic%20Workplace%20Search%20Feedback`;

export const PERSONAL_PATH = '/p';

export const OAUTH_AUTHORIZE_PATH = `${PERSONAL_PATH}/oauth/authorize`;
export const SEARCH_AUTHORIZE_PATH = `${PERSONAL_PATH}/authorize_search`;

export const USERS_AND_ROLES_PATH = '/users_and_roles';

export const API_KEYS_PATH = '/api_keys';

export const SECURITY_PATH = '/security';

export const GROUPS_PATH = '/groups';
export const GROUP_PATH = `${GROUPS_PATH}/:groupId`;
export const GROUP_SOURCE_PRIORITIZATION_PATH = `${GROUPS_PATH}/:groupId/source_prioritization`;

export const SOURCES_PATH = '/sources';
export const PRIVATE_SOURCES_PATH = `${PERSONAL_PATH}${SOURCES_PATH}`;

export const SOURCE_ADDED_PATH = `${SOURCES_PATH}/added`;
export const ADD_SOURCE_PATH = `${SOURCES_PATH}/add`;
export const ADD_BOX_PATH = `${SOURCES_PATH}/add/box`;
export const ADD_CONFLUENCE_PATH = `${SOURCES_PATH}/add/confluence_cloud`;
export const ADD_CONFLUENCE_SERVER_PATH = `${SOURCES_PATH}/add/confluence_server`;
export const ADD_DROPBOX_PATH = `${SOURCES_PATH}/add/dropbox`;
export const ADD_GITHUB_ENTERPRISE_PATH = `${SOURCES_PATH}/add/github_enterprise_server`;
export const ADD_GITHUB_PATH = `${SOURCES_PATH}/add/github`;
export const ADD_GITHUB_VIA_APP_PATH = `${SOURCES_PATH}/add/${GITHUB_VIA_APP_SERVICE_TYPE}`;
export const ADD_GITHUB_ENTERPRISE_SERVER_VIA_APP_PATH = `${SOURCES_PATH}/add/${GITHUB_ENTERPRISE_SERVER_VIA_APP_SERVICE_TYPE}`;
export const ADD_GMAIL_PATH = `${SOURCES_PATH}/add/gmail`;
export const ADD_GOOGLE_DRIVE_PATH = `${SOURCES_PATH}/add/google_drive`;
export const ADD_JIRA_PATH = `${SOURCES_PATH}/add/jira_cloud`;
export const ADD_JIRA_SERVER_PATH = `${SOURCES_PATH}/add/jira_server`;
export const ADD_ONEDRIVE_PATH = `${SOURCES_PATH}/add/one_drive`;
export const ADD_SALESFORCE_PATH = `${SOURCES_PATH}/add/salesforce`;
export const ADD_SALESFORCE_SANDBOX_PATH = `${SOURCES_PATH}/add/salesforce_sandbox`;
export const ADD_SERVICENOW_PATH = `${SOURCES_PATH}/add/servicenow`;
export const ADD_SHAREPOINT_PATH = `${SOURCES_PATH}/add/share_point`;
export const ADD_SLACK_PATH = `${SOURCES_PATH}/add/slack`;
export const ADD_ZENDESK_PATH = `${SOURCES_PATH}/add/zendesk`;
export const ADD_CUSTOM_PATH = `${SOURCES_PATH}/add/custom`;

export const PERSONAL_SETTINGS_PATH = `${PERSONAL_PATH}/settings`;

export const SOURCE_DETAILS_PATH = `${SOURCES_PATH}/:sourceId`;
export const SOURCE_CONTENT_PATH = `${SOURCES_PATH}/:sourceId/content`;
export const SOURCE_SCHEMAS_PATH = `${SOURCES_PATH}/:sourceId/schemas`;
export const SOURCE_DISPLAY_SETTINGS_PATH = `${SOURCES_PATH}/:sourceId/display_settings`;
export const SOURCE_SYNCHRONIZATION_PATH = `${SOURCES_PATH}/:sourceId/synchronization`;
export const SOURCE_SETTINGS_PATH = `${SOURCES_PATH}/:sourceId/settings`;
export const REINDEX_JOB_PATH = `${SOURCE_SCHEMAS_PATH}/:activeReindexJobId`;

export const DISPLAY_SETTINGS_SEARCH_RESULT_PATH = `${SOURCE_DISPLAY_SETTINGS_PATH}/`;
export const DISPLAY_SETTINGS_RESULT_DETAIL_PATH = `${SOURCE_DISPLAY_SETTINGS_PATH}/result_detail`;

export const SYNC_FREQUENCY_PATH = `${SOURCE_SYNCHRONIZATION_PATH}/frequency`;
export const BLOCKED_TIME_WINDOWS_PATH = `${SOURCE_SYNCHRONIZATION_PATH}/frequency/blocked_windows`;
export const OBJECTS_AND_ASSETS_PATH = `${SOURCE_SYNCHRONIZATION_PATH}/objects_and_assets`;

export const ORG_SETTINGS_PATH = '/settings';
export const ORG_SETTINGS_CUSTOMIZE_PATH = `${ORG_SETTINGS_PATH}/customize`;
export const ORG_SETTINGS_CONNECTORS_PATH = `${ORG_SETTINGS_PATH}/connectors`;
export const ORG_SETTINGS_OAUTH_APPLICATION_PATH = `${ORG_SETTINGS_PATH}/oauth`;
export const EDIT_BOX_PATH = `${ORG_SETTINGS_CONNECTORS_PATH}/box/edit`;
export const EDIT_CONFLUENCE_PATH = `${ORG_SETTINGS_CONNECTORS_PATH}/confluence_cloud/edit`;
export const EDIT_CONFLUENCE_SERVER_PATH = `${ORG_SETTINGS_CONNECTORS_PATH}/confluence_server/edit`;
export const EDIT_DROPBOX_PATH = `${ORG_SETTINGS_CONNECTORS_PATH}/dropbox/edit`;
export const EDIT_GITHUB_ENTERPRISE_PATH = `${ORG_SETTINGS_CONNECTORS_PATH}/github_enterprise_server/edit`;
export const EDIT_GITHUB_PATH = `${ORG_SETTINGS_CONNECTORS_PATH}/github/edit`;
export const EDIT_GMAIL_PATH = `${ORG_SETTINGS_CONNECTORS_PATH}/gmail/edit`;
export const EDIT_GOOGLE_DRIVE_PATH = `${ORG_SETTINGS_CONNECTORS_PATH}/google_drive/edit`;
export const EDIT_JIRA_PATH = `${ORG_SETTINGS_CONNECTORS_PATH}/jira_cloud/edit`;
export const EDIT_JIRA_SERVER_PATH = `${ORG_SETTINGS_CONNECTORS_PATH}/jira_server/edit`;
export const EDIT_ONEDRIVE_PATH = `${ORG_SETTINGS_CONNECTORS_PATH}/one_drive/edit`;
export const EDIT_SALESFORCE_PATH = `${ORG_SETTINGS_CONNECTORS_PATH}/salesforce/edit`;
export const EDIT_SALESFORCE_SANDBOX_PATH = `${ORG_SETTINGS_CONNECTORS_PATH}/salesforce_sandbox/edit`;
export const EDIT_SERVICENOW_PATH = `${ORG_SETTINGS_CONNECTORS_PATH}/servicenow/edit`;
export const EDIT_SHAREPOINT_PATH = `${ORG_SETTINGS_CONNECTORS_PATH}/share_point/edit`;
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
export const getSourcesPath = (path: string, isOrganization?: boolean): string =>
  isOrganization ? path : `${PERSONAL_PATH}${path}`;
export const getReindexJobRoute = (
  sourceId: string,
  activeReindexJobId: string,
  isOrganization: boolean
) =>
  getSourcesPath(generatePath(REINDEX_JOB_PATH, { sourceId, activeReindexJobId }), isOrganization);
