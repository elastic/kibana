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
import { SearchEnginesPopover } from './search_engines_popover';
import { SyncsContextMenu } from './syncs_context_menu';

describe('Header Actions', () => {
  it('renders api index', () => {
    expect(getHeaderActions(apiIndex)).toEqual([
      <SearchEnginesPopover indexName="api" ingestionMethod="api" isHiddenIndex={false} />,
    ]);
  });
  it('renders connector index', () => {
    expect(getHeaderActions(connectorIndex)).toEqual([
      <SyncsContextMenu />,
      <SearchEnginesPopover
        indexName="connector"
        ingestionMethod="connector"
        isHiddenIndex={false}
      />,
    ]);
  });
  it('renders crawler index', () => {
    expect(getHeaderActions(crawlerIndex)).toEqual([
      <CrawlerStatusIndicator />,
      <SearchEnginesPopover indexName="crawler" ingestionMethod="crawler" isHiddenIndex={false} />,
    ]);
  });
});
