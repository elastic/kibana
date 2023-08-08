/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import { useValues, useActions } from 'kea';

import {
  EuiButton, EuiSpacer,
} from '@elastic/eui';

import { CrawlCustomSettingsFlyoutLogic } from './crawl_custom_settings_flyout_logic';

export const CrawlCustomSettingsFlyoutMultipleCrawlDelete: React.FC = () => {
  const { activeCrawlerConfigTab, crawlerConfigs } = useValues(CrawlCustomSettingsFlyoutLogic);
  const { onDeleteCustomCrawler } = useActions(CrawlCustomSettingsFlyoutLogic);

  return <>
    <EuiSpacer />
    <EuiButton
      iconType="trash"
      color='danger'
      disabled={crawlerConfigs.length < 2}
      onClick={() => onDeleteCustomCrawler(activeCrawlerConfigTab)}
    >
      {`Delete Crawl ${activeCrawlerConfigTab + 1}`}
    </EuiButton>
  </>

};
