/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import { useValues, useActions } from 'kea';

import {
  EuiTab,
  EuiTabs,
  EuiSpacer,
  EuiIcon,
} from '@elastic/eui';

import { i18n } from '@kbn/i18n';

import { CrawlCustomSettingsFlyoutLogic } from './crawl_custom_settings_flyout_logic';

import { CrawlType } from '../../../../api/crawler/types';


const CRAWLER_TAB_PREFIX = i18n.translate(
  'xpack.enterpriseSearch.crawler.crawlCustomSettingsFlyout.multipleCrawlTabPrefix',
  {
    defaultMessage: 'Crawl',
  }
)

export const CrawlCustomSettingsFlyoutMultipleCrawlTabs: React.FC = () => {
  const { activeCrawlerConfigTab, crawlType, crawlerConfigs } = useValues(CrawlCustomSettingsFlyoutLogic);
  const { onAddCustomCrawler, onSelectActiveCrawlerConfigTab } = useActions(CrawlCustomSettingsFlyoutLogic);

  const crawlerTabData = crawlerConfigs.map((crawler, index) => ({
    key: `crawl_${index}`,
    index: index,
    label: `${CRAWLER_TAB_PREFIX} ${index + 1}`,
  }));

  if (crawlType === CrawlType.ONE_TIME) {
    return <></>;
  }

  return <>
    <EuiTabs>
      {crawlerTabData.map((tab) => (
        <EuiTab key={tab.key} isSelected={activeCrawlerConfigTab === tab.index} onClick={() => onSelectActiveCrawlerConfigTab(tab.index)}>
          {tab.label}
        </EuiTab>
      ))}
      <EuiTab onClick={onAddCustomCrawler}>
        <EuiIcon type="plus" />
      </EuiTab>
    </EuiTabs>
    <EuiSpacer />
  </>

};
