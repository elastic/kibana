/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import { useValues, useActions } from 'kea';

import { EuiButton } from '@elastic/eui';

import { CrawlCustomSettingsFlyoutMultiCrawlLogic } from './crawl_custom_settings_flyout_multi_crawl_logic';

export const CrawlCustomSettingsFlyoutMultipleCrawlDelete: React.FC = () => {
  const { crawlerConfigActiveTab, crawlerConfigurations } = useValues(
    CrawlCustomSettingsFlyoutMultiCrawlLogic
  );
  const { onDeleteCustomCrawler } = useActions(CrawlCustomSettingsFlyoutMultiCrawlLogic);

  return (
    <>
      <EuiButton
        iconType="trash"
        color="danger"
        disabled={crawlerConfigurations.length < 2}
        onClick={() => onDeleteCustomCrawler(crawlerConfigActiveTab)}
      >
        {`Delete Crawl ${crawlerConfigActiveTab + 1}`}
      </EuiButton>
    </>
  );
};
