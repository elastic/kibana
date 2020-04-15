/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

export const API_VERSION = 'v2';
export const INCIDENT_URL = `api/now/${API_VERSION}/table/incident`;
export const USER_URL = `api/now/${API_VERSION}/table/sys_user?user_name=`;
export const COMMENT_URL = `api/now/${API_VERSION}/table/incident`;

// Based on: https://docs.servicenow.com/bundle/orlando-platform-user-interface/page/use/navigation/reference/r_NavigatingByURLExamples.html
export const VIEW_INCIDENT_URL = `nav_to.do?uri=incident.do?sys_id=`;
