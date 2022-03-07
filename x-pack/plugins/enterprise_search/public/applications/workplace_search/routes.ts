/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { generatePath } from 'react-router-dom';

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
export const ADD_EXTERNAL_PATH = `${SOURCES_PATH}/add/external`;
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
export const OLD_OBJECTS_AND_ASSETS_PATH = `${SOURCE_SYNCHRONIZATION_PATH}/objects_and_assets`;
export const ASSETS_AND_OBJECTS_PATH = `${SOURCE_SYNCHRONIZATION_PATH}/assets_and_objects`;

export const ORG_SETTINGS_PATH = '/settings';
export const ORG_SETTINGS_CUSTOMIZE_PATH = `${ORG_SETTINGS_PATH}/customize`;
export const ORG_SETTINGS_CONNECTORS_PATH = `${ORG_SETTINGS_PATH}/connectors`;
export const ORG_SETTINGS_OAUTH_APPLICATION_PATH = `${ORG_SETTINGS_PATH}/oauth`;

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
export const getAddPath = (serviceType: string): string => `${SOURCES_PATH}/add/${serviceType}`;
export const getEditPath = (serviceType: string): string =>
  `${ORG_SETTINGS_CONNECTORS_PATH}/${serviceType}/edit`;
