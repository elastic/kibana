/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
export { PLUGIN_ID, EPM_API_ROUTES, AGENT_CONFIG_SAVED_OBJECT_TYPE } from '../../../../common';

export const BASE_PATH = '/app/ingestManager';
export const EPM_PATH = '/epm';
export const EPM_DETAIL_VIEW_PATH = `${EPM_PATH}/detail/:pkgkey/:panel?`;
export const AGENT_CONFIG_PATH = '/configs';
export const AGENT_CONFIG_DETAILS_PATH = `${AGENT_CONFIG_PATH}/`;
export const FLEET_PATH = '/fleet';
export const FLEET_AGENTS_PATH = `${FLEET_PATH}/agents`;

export const INDEX_NAME = '.kibana';
