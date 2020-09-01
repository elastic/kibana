/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

export const ROOT_PATH = '/';
export const SETUP_GUIDE_PATH = '/setup_guide';
export const SETTINGS_PATH = '/settings/account';
export const CREDENTIALS_PATH = '/credentials';
export const ROLE_MAPPINGS_PATH = '#/role-mappings'; // This page seems to 404 if the # isn't included

export const ENGINES_PATH = '/engines';
export const CREATE_ENGINES_PATH = `${ENGINES_PATH}/new`;

export const ENGINE_PATH = '/engines/:engineName';
export const getEngineRoute = (engineName: string) => `${ENGINES_PATH}/${engineName}`;
