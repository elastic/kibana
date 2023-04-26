/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export const ROUTES = {
  CRAWLER_INDEX: '/app/enterprise_search/content/search_indices/new_index/crawler',
  NEW_INDEX: '/app/enterprise_search/content/search_indices/new_index',
  SELECT_CONNECTOR: '/app/enterprise_search/content/search_indices/new_index/select_connector',
};

export const SELECT_CONNECTOR = {
  SELECT_AND_CONFIGURE_BUTTON: 'entSearchContent-connector-selectConnector-selectAndConfigure',
};

export const NEW_CONNECTOR_PAGE = {
  CREATE_BUTTON: 'entSearchContent-connector-newIndex-createIndex',
  INDEX_NAME_INPUT: 'entSearchContent-connector-newIndex-editName',
};

export const CONNECTOR_INDEX = {
  HEADER_SYNC_MENU: `entSearchContent-connector-header-sync-menu`,
  HEADER_SYNC_MENU_START: `entSearchContent-connector-header-sync-startSync`,
  SAVE_CONFIG: `entSearchContent-connector-configuration-saveConfiguration`,
  getConfigurationRow: (rowkey: string) =>
    `entSearchContent-connector-configuration-formrow-${rowkey}`,
};

export const NEW_INDEX_PAGE = {
  continueButton: 'entSearchContent-newIndexPage-continueButton',
};

export const NEW_INDEX_CARD = {
  SELECT_CONNECTOR: 'entSearchContent-newIndexCard-button-connector',
  SELECT_CRAWLER: 'entSearchContent-newIndexCard-button-crawler',
};

export const CRAWLER_INDEX = {
  CREATE_BUTTON: 'entSearchContent-crawler-newIndex-createIndex',
  INDEX_NAME_INPUT: 'entSearchContent-crawler-newIndex-editName',
};

export const INDEX_OVERVIEW = {
  STATS: {
    CONNECTOR_TYPE: 'entSearchContent-indexOverview-totalStats-connectorType',
    DOCUMENT_COUNT: 'entSearchContent-indexOverview-connectorStats-documentCount',
    INGESTION_STATUS: 'entSearchContent-indexOverview-connectorStats-ingestionStatus',
    INGESTION_TYPE: 'entSearchContent-indexOverview-totalStats-ingestionType',
  },
  TABS: {
    OVERVIEW: 'entSearchContent-index-overview-tab',
  },
};

export const getIndexRoute = (indexName: string) => {
  return `/app/enterprise_search/content/search_indices/search-${indexName}/`;
};
