/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export const ROOT_PATH = '/';

export const SETUP_GUIDE_PATH = '/setup_guide';
export const ERROR_STATE_PATH = '/error_state';

export const SEARCH_INDICES_PATH = `${ROOT_PATH}search_indices`;
export const CONNECTORS_PATH = `${ROOT_PATH}connectors`;
export const CRAWLERS_PATH = `${ROOT_PATH}crawlers`;
export const SETTINGS_PATH = `${ROOT_PATH}settings`;

export const NEW_INDEX_PATH = `${SEARCH_INDICES_PATH}/new_index`;
export const NEW_API_PATH = `${NEW_INDEX_PATH}/api`;
export const NEW_ES_INDEX_PATH = `${NEW_INDEX_PATH}/elasticsearch`;
export const NEW_DIRECT_UPLOAD_PATH = `${NEW_INDEX_PATH}/upload`;
export const NEW_INDEX_SELECT_CONNECTOR_PATH = `${CONNECTORS_PATH}/select_connector`;
export const NEW_CONNECTOR_PATH = `${CONNECTORS_PATH}/new_connector`;
export const NEW_CRAWLER_PATH = `${CRAWLERS_PATH}/new_crawler`;
export const NEW_INDEX_SELECT_CONNECTOR_NATIVE_PATH = `${CONNECTORS_PATH}/select_connector?filter=native`;
export const NEW_INDEX_SELECT_CONNECTOR_CLIENTS_PATH = `${CONNECTORS_PATH}/select_connector?filter=connector_clients`;

export const SEARCH_INDEX_PATH = `${SEARCH_INDICES_PATH}/:indexName`;
export const SEARCH_INDEX_TAB_PATH = `${SEARCH_INDEX_PATH}/:tabId`;
export const SEARCH_INDEX_TAB_DETAIL_PATH = `${SEARCH_INDEX_TAB_PATH}/:detailId`;
export const SEARCH_INDEX_CRAWLER_DOMAIN_DETAIL_PATH = `${SEARCH_INDEX_TAB_PATH}/:domainId`;
export const OLD_SEARCH_INDEX_CRAWLER_DOMAIN_DETAIL_PATH = `${SEARCH_INDEX_PATH}/crawler/domains/:domainId`;

export const ML_MANAGE_TRAINED_MODELS_PATH = '/app/ml/trained_models';
export const ML_NOTIFICATIONS_PATH = '/app/ml/notifications';

export const DEV_TOOLS_CONSOLE_PATH = '/app/dev_tools#/console';

export const CONNECTOR_DETAIL_PATH = `${CONNECTORS_PATH}/:connectorId`;
export const CONNECTOR_DETAIL_TAB_PATH = `${CONNECTOR_DETAIL_PATH}/:tabId`;
