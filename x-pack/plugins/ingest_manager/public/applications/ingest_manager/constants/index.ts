/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { PLUGIN_ID } from '../../../../common';
export {
  PLUGIN_ID,
  EPM_API_ROUTES,
  DEFAULT_AGENT_CONFIG_ID,
  AGENT_CONFIG_SAVED_OBJECT_TYPE,
} from '../../../../common';
export const BASE_PATH = `/app/${PLUGIN_ID}`;
export const EPM_PATH = '/epm';
export const EPM_DETAIL_VIEW_PATH = `${EPM_PATH}/detail/:pkgkey/:panel?`;
export const AGENT_CONFIG_PATH = '/configs';
export const AGENT_CONFIG_DETAILS_PATH = '/configs/';
export const FLEET_PATH = '/fleet';

export const INDEX_NAME = '.kibana';
