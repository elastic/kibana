/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import { useValues, useActions } from 'kea';

import { EuiTab, EuiTabs, EuiSpacer, EuiIcon } from '@elastic/eui';

import { i18n } from '@kbn/i18n';

import { CrawlCustomSettingsFlyoutMultiCrawlLogic } from './crawl_custom_settings_flyout_multi_crawl_logic';

const CRAWLER_TAB_PREFIX = i18n.translate(
  'xpack.enterpriseSearch.crawler.crawlCustomSettingsFlyout.multipleCrawlTabPrefix',
  {
    defaultMessage: 'Crawl',
  }
);

export const CrawlCustomSettingsFlyoutMultipleCrawlTabs: React.FC = () => {
  const { crawlerConfigActiveTab, crawlerConfigurations } = useValues(
    CrawlCustomSettingsFlyoutMultiCrawlLogic
  );
  const { onAddCustomCrawler, onSelectCrawlerConfigActiveTab } = useActions(
    CrawlCustomSettingsFlyoutMultiCrawlLogic
  );

  const crawlerTabData = crawlerConfigurations.map((_, index) => ({
    key: `crawler_${index}`,
    index,
    label: `${CRAWLER_TAB_PREFIX} ${index + 1}`,
  }));

  return (
    <>
      <EuiTabs>
        {crawlerTabData.map((tab) => (
          <EuiTab
            key={tab.key}
            isSelected={crawlerConfigActiveTab === tab.index}
            onClick={() => onSelectCrawlerConfigActiveTab(tab.index)}
          >
            {tab.label}
          </EuiTab>
        ))}
        <EuiTab onClick={() => onAddCustomCrawler(crawlerConfigurations.length)}>
          <EuiIcon type="plus" />
        </EuiTab>
      </EuiTabs>
      <EuiSpacer />
    </>
  );
};
