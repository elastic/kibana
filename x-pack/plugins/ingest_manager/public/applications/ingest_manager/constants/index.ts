/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

export {
  PLUGIN_ID,
  EPM_API_ROUTES,
  DEFAULT_AGENT_CONFIG_ID,
  AGENT_CONFIG_SAVED_OBJECT_TYPE,
} from '../../../../common';

// intially tried `/app/${PLUGIN_ID}` but that returned `/app/undefined`
// Could be due to import/import()/export or something else
// thankfully, we're not likely to change our id and it's only one place to update
export const BASE_PATH = '/app/ingestManager';
export const EPM_PATH = '/epm';
export const AGENT_CONFIG_PATH = '/configs';
export const AGENT_CONFIG_DETAILS_PATH = '/configs/';
export const FLEET_PATH = '/fleet';
