/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export const ROOT_PATH = '/';

export const SETUP_GUIDE_PATH = '/setup_guide';

export const INDICES_PATH = `${ROOT_PATH}indices`;
export const CONNECTOR_SETTINGS_PATH = `${ROOT_PATH}connector_settings`;
export const CRAWLER_SETTINGS_PATH = `${ROOT_PATH}crawler_settings`;

export const NEW_INDEX_PATH = `${INDICES_PATH}/new_index`;
export const NEW_API_PATH = `${NEW_INDEX_PATH}/api`;
export const NEW_ES_INDEX_PATH = `${NEW_INDEX_PATH}/elasticsearch`;
export const NEW_DIRECT_UPLOAD_PATH = `${NEW_INDEX_PATH}/upload`;

export const INDEX_PATH = `${INDICES_PATH}/:indexSlug`;
export const INDEX_OVERVIEW_PATH = `${INDEX_PATH}`;
export const INDEX_DOCUMENTS_PATH = `${INDEX_PATH}/documents`;
export const INDEX_SCHEMA_PATH = `${INDEX_PATH}/schema`;
export const INDEX_LOGS_PATH = `${INDEX_PATH}/logs`;
