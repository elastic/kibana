/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export const ROUTES = {
  CRAWLER_INDEX: '/app/enterprise_search/content/crawlers/new_crawler',
  NEW_INDEX: '/app/enterprise_search/content/search_indices/new_index',
  SEARCH_INDICES_OVERVIEW: '/app/enterprise_search/content/search_indices/',
  SELECT_CONNECTOR: '/app/enterprise_search/content/connectors/select_connector',
};

export const SEARCH_INDICES = {
  CREATE_INDEX_BUTTON: 'entSearchContent-searchIndices-createButton',
};

export const SELECT_CONNECTOR = {
  SELECT_AND_CONFIGURE_BUTTON: 'entSearchContent-connector-selectConnector-selectAndConfigure',
};

export const NEW_CONNECTOR_PAGE = {
  CREATE_BUTTON: 'entSearchContent-connector-newIndex-createIndex',
  INDEX_NAME_INPUT: 'entSearchContent-connector-newIndex-editName',
};

export const CONNECTOR_INDEX = {
  EDIT_CONFIG: 'entSearchContent-connector-configuration-editConfiguration',
  HEADER_SYNC_MENU: 'entSearchContent-connector-header-sync-menu',
  HEADER_SYNC_MENU_START: 'entSearchContent-connector-header-sync-startSync',
  SAVE_CONFIG: 'entSearchContent-connector-configuration-saveConfiguration',
  SET_SCHEDULE_BUTTON: 'entSearchContent-connector-configuration-setScheduleAndSync',
  getConfigurationRow: (rowkey: string) =>
    `entSearchContent-connector-configuration-formrow-${rowkey}`,
};

export const NEW_INDEX_CARD = {
  SELECT_CONNECTOR: 'entSearchContent-newIndexCard-button-connector',
  SELECT_CRAWLER: 'entSearchContent-newIndexCard-button-crawler',
};

export const CRAWLER_INDEX = {
  CRAWL_ALL_DOMAINS: 'entSearchContent-crawler-startCrawlMenu-crawlAllDomains',
  CRAWL_DROPDOWN: 'entSearchContent-crawler-startCrawlMenu-menuButton',
  CREATE_BUTTON: 'entSearchContent-crawler-newIndex-createIndex',
  DOMAIN_MANAGEMENT: {
    DOMAIN_BUTTON: 'entSearchContent-crawler-addDomainForm-validate-button',
    DOMAIN_INPUT: 'entSearchContent-crawler-addDomainForm-validate-input',
    SUBMIT_BUTTON: 'entSearchContent-crawler-addDomain-submitButton',
  },
  INDEX_NAME_INPUT: 'entSearchContent-crawler-newIndex-editName',
};

export const INDEX_OVERVIEW = {
  STATS: {
    CONNECTOR_TYPE: 'entSearchContent-indexOverview-totalStats-connectorType',
    DOCUMENT_COUNT: 'entSearchContent-indexOverview-totalStats-documentCount',
    INGESTION_STATUS: 'entSearchContent-indexOverview-connectorStats-ingestionStatus',
    INGESTION_TYPE: 'entSearchContent-indexOverview-totalStats-ingestionType',
  },
  TABS: {
    CRAWLER_SCHEDULER: 'entSearchContent-index-crawler-scheduler-tab',
    OVERVIEW: 'entSearchContent-index-overview-tab',
  },
};

export const getIndexRoute = (indexName: string) => {
  return `/app/enterprise_search/content/search_indices/search-${indexName}/`;
};
