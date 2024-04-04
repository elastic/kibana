/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { apiIndex, connectorIndex, crawlerIndex } from '../../../../__mocks__/view_index.mock';

import React from 'react';

import { CrawlerStatusIndicator } from '../../../shared/crawler_status_indicator/crawler_status_indicator';

import { getHeaderActions } from './header_actions';
import { SearchEnginesPlayground } from './search_engines_playground';
import { SyncsContextMenu } from './syncs_context_menu';

describe('Header Actions', () => {
  it('renders api index', () => {
    expect(getHeaderActions(apiIndex, true)).toEqual([
      <SearchEnginesPlayground indexName="api" ingestionMethod="api" />,
    ]);
    expect(getHeaderActions(apiIndex, false)).toEqual([]);
  });
  it('renders connector index', () => {
    expect(getHeaderActions(connectorIndex, true)).toEqual([
      <SyncsContextMenu />,
      <SearchEnginesPlayground indexName="connector" ingestionMethod="connector" />,
    ]);
    expect(getHeaderActions(connectorIndex, false)).toEqual([<SyncsContextMenu />]);
  });
  it('renders crawler index', () => {
    expect(getHeaderActions(crawlerIndex, true)).toEqual([
      <CrawlerStatusIndicator />,
      <SearchEnginesPlayground indexName="crawler" ingestionMethod="crawler" />,
    ]);
    expect(getHeaderActions(crawlerIndex, false)).toEqual([<CrawlerStatusIndicator />]);
  });
});
