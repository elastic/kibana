/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import { ElasticsearchIndexWithIngestion } from '../../../../../../../common/types/indices';
import { isCrawlerIndex, isConnectorIndex, getIngestionMethod } from '../../../../utils/indices';
import { CrawlerStatusIndicator } from '../../../shared/crawler_status_indicator/crawler_status_indicator';

import { SearchEnginesPopover } from './search_engines_popover';
import { SyncButton } from './sync_button';

// Used to populate rightSideItems of an EuiPageTemplate, which is rendered right-to-left
export const getHeaderActions = (indexData?: ElasticsearchIndexWithIngestion) => {
  const ingestionMethod = getIngestionMethod(indexData);
  return [
    ...(isCrawlerIndex(indexData) ? [<CrawlerStatusIndicator />] : []),
    ...(isConnectorIndex(indexData) ? [<SyncButton />] : []),
    <SearchEnginesPopover
      indexName={indexData?.name}
      ingestionMethod={ingestionMethod}
      isHiddenIndex={indexData?.hidden}
    />,
  ];
};
