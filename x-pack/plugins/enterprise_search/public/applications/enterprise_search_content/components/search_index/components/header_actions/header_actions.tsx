/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import { Connector } from '@kbn/search-connectors';

import { ElasticsearchIndexWithIngestion } from '../../../../../../../common/types/indices';
import { isCrawlerIndex, isConnectorIndex, getIngestionMethod } from '../../../../utils/indices';
import { CrawlerStatusIndicator } from '../../../shared/crawler_status_indicator/crawler_status_indicator';

import { SearchPlaygroundPopover } from './search_playground_popover';
import { SyncsContextMenu } from './syncs_context_menu';

// Used to populate rightSideItems of an EuiPageTemplate, which is rendered right-to-left
export const getHeaderActions = (
  indexData: ElasticsearchIndexWithIngestion | undefined,
  connector?: Connector
) => {
  const ingestionMethod = getIngestionMethod(indexData);
  return [
    ...(isCrawlerIndex(indexData) && indexData.connector ? [<CrawlerStatusIndicator />] : []),
    ...(isConnectorIndex(indexData) || connector ? [<SyncsContextMenu />] : []),
    ...(indexData
      ? [<SearchPlaygroundPopover indexName={indexData?.name} ingestionMethod={ingestionMethod} />]
      : []),
  ];
};
