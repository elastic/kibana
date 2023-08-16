/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import { useValues, useActions } from 'kea';

import { EuiSpacer } from '@elastic/eui';

import { CrawlCustomSettingsFlyoutCrawlDepthPanel } from './crawl_custom_settings_flyout_crawl_depth_panel';
import { MultiCrawlScheduler } from './crawl_custom_settings_flyout_crawl_scheduler';
import { CrawlCustomSettingsFlyoutDomainsPanel } from './crawl_custom_settings_flyout_domains_panel';
import { CrawlCustomSettingsFlyoutLogic } from './crawl_custom_settings_flyout_logic';
import { CrawlCustomSettingsFlyoutMultiCrawlLogic } from './crawl_custom_settings_flyout_multi_crawl_logic';
import { CrawlCustomSettingsFlyoutSeedUrlsPanel } from './crawl_custom_settings_flyout_seed_urls_panel';

export const CrawlCustomSettingsFlyoutMultiCrawlScheduling: React.FC = () => {
  const { domainUrls, multiCrawlerEntryPointUrls, multiCrawlerSitemapUrls } = useValues(
    CrawlCustomSettingsFlyoutLogic
  );

  const {
    crawlerConfigurations,
    crawlerConfigActiveTab,
    index: crawlerIndex,
  } = useValues(CrawlCustomSettingsFlyoutMultiCrawlLogic);

  const {
    onSelectMaxCrawlDepth,
    onSelectDomainUrls,
    onSelectCustomEntryPointUrls,
    onSelectCustomSitemapUrls,
    onSelectEntryPointUrls,
    onSelectSitemapUrls,
    toggleIncludeSitemapsInRobotsTxt,
    setConnectorSchedulingInterval,
    onSetConnectorSchedulingEnabled,
  } = useActions(CrawlCustomSettingsFlyoutMultiCrawlLogic);

  return (
    <>
      {crawlerConfigurations.map((config, index) => {
        if (index === crawlerConfigActiveTab) {
          return (
            <React.Fragment key={index}>
              <CrawlCustomSettingsFlyoutCrawlDepthPanel
                maxCrawlDepth={config.maxCrawlDepth}
                onSelectMaxCrawlDepth={(e) => onSelectMaxCrawlDepth(index, e)}
              />
              <EuiSpacer />
              <CrawlCustomSettingsFlyoutDomainsPanel
                selectedDomainUrls={config.selectedDomainUrls}
                domainUrls={domainUrls}
                onSelectDomainUrls={(e) => onSelectDomainUrls(index, e)}
              />
              <EuiSpacer />
              <CrawlCustomSettingsFlyoutSeedUrlsPanel
                scheduleConfig={config}
                onSelectCustomEntryPointUrls={(e) => onSelectCustomEntryPointUrls(index, e)}
                onSelectCustomSitemapUrls={(e) => onSelectCustomSitemapUrls(index, e)}
                onSelectEntryPointUrls={(e) => onSelectEntryPointUrls(index, e)}
                onSelectSitemapUrls={(e) => onSelectSitemapUrls(index, e)}
                toggleIncludeSitemapsInRobotsTxt={() => toggleIncludeSitemapsInRobotsTxt(index)}
                entryPointUrls={multiCrawlerEntryPointUrls[index]}
                sitemapUrls={multiCrawlerSitemapUrls[index]}
              />
              <EuiSpacer />
              <MultiCrawlScheduler
                index={crawlerIndex}
                interval={config.interval}
                schedulingEnabled={config.enabled}
                setConnectorSchedulingInterval={(e) => setConnectorSchedulingInterval(index, e)}
                onSetConnectorSchedulingEnabled={(e) => onSetConnectorSchedulingEnabled(index, e)}
              />
            </React.Fragment>
          );
        }
      })}
    </>
  );
};
