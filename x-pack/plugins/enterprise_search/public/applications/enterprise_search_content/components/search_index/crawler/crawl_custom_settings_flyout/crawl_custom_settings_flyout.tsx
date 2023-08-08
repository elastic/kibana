/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import { useValues, useActions } from 'kea';

import {
  EuiButton,
  EuiButtonEmpty,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFlyout,
  EuiFlyoutBody,
  EuiFlyoutFooter,
  EuiFlyoutHeader,
  EuiSpacer,
  EuiText,
  EuiTitle,
  EuiTabs,
  EuiTab,
  EuiFormFieldset,
  EuiRadioGroup,
  EuiRadio,
  EuiFormRow
} from '@elastic/eui';

import { i18n } from '@kbn/i18n';

import { CANCEL_BUTTON_LABEL } from '../../../../../shared/constants';
import { CustomCrawlType } from '../../../../api/crawler/types';
import { Loading } from '../../../../../shared/loading';

import { CrawlCustomSettingsFlyoutCrawlDepthPanel } from './crawl_custom_settings_flyout_crawl_depth_panel';
import { CrawlCustomSettingsFlyoutCrawlTypeSelection } from './crawl_custom_settings_flyout_crawl_type_selection';
import { CrawlCustomSettingsFlyoutMultipleCrawlTabs } from './crawl_custom_settings_flyout_multiple_crawl_tabs';
import { CrawlCustomSettingsFlyoutMultipleCrawlDelete } from './crawl_custom_settings_flyout_multiple_crawls_delete';
import { CrawlCustomSettingsFlyoutDomainsPanel } from './crawl_custom_settings_flyout_domains_panel';
import { CrawlCustomSettingsFlyoutLogic } from './crawl_custom_settings_flyout_logic';
import { CrawlCustomSettingsFlyoutSeedUrlsPanel } from './crawl_custom_settings_flyout_seed_urls_panel';

export const CrawlCustomSettingsFlyout: React.FC = () => {
  const { isDataLoading, isFormSubmitting, isFlyoutVisible, crawlType, crawlerConfigs, activeCrawlerConfigTab } = useValues(
    CrawlCustomSettingsFlyoutLogic
  );
  const { hideFlyout, startCustomCrawl } = useActions(CrawlCustomSettingsFlyoutLogic);

  if (!isFlyoutVisible) {
    return null;
  }

  return (
    <EuiFlyout ownFocus onClose={hideFlyout} size="m">
      <EuiFlyoutHeader hasBorder>
        <EuiTitle size="m">
          <h2>
            {i18n.translate(
              'xpack.enterpriseSearch.crawler.crawlCustomSettingsFlyout.flyoutHeadTitle',
              {
                defaultMessage: 'Custom crawl configuration',
              }
            )}
          </h2>
        </EuiTitle>
        <EuiSpacer size="s" />
        <EuiText size="s">
          <p>
            {i18n.translate(
              'xpack.enterpriseSearch.crawler.crawlCustomSettingsFlyout.flyoutHeaderDescription',
              {
                defaultMessage: 'Set up a one-time crawl or multiple crawling custom settings.',
              }
            )}
          </p>
        </EuiText>
      </EuiFlyoutHeader>

      <EuiFlyoutBody>
        {isDataLoading ? (
          <Loading />
        ) : (
          <>
            <CrawlCustomSettingsFlyoutCrawlTypeSelection />
            <EuiSpacer />
            {crawlType === CustomCrawlType.ONE_TIME ?
              <>
                {/* <CrawlCustomSettingsFlyoutCrawlDepthPanel />
                <EuiSpacer />
                <CrawlCustomSettingsFlyoutDomainsPanel />
                <EuiSpacer />
                <CrawlCustomSettingsFlyoutSeedUrlsPanel /> */}
              </>
              :
              <>
                <CrawlCustomSettingsFlyoutMultipleCrawlTabs />
                {crawlerConfigs.map((config, index) => {
                  if (index === activeCrawlerConfigTab) {
                    return <React.Fragment key={index}>
                      <CrawlCustomSettingsFlyoutCrawlDepthPanel maxCrawlDepth={config.maxCrawlDepth} index={index} />
                      <EuiSpacer />
                      <CrawlCustomSettingsFlyoutDomainsPanel index={index} selectedDomainUrls={config.selectedDomainUrls} />
                      <EuiSpacer />
                      <CrawlCustomSettingsFlyoutSeedUrlsPanel
                        index={index}
                        customEntryPointUrls={config.customEntryPointUrls}
                        customSitemapUrls={config.customSitemapUrls}
                        includeSitemapsInRobotsTxt={config.includeSitemapsInRobotsTxt}
                        selectedDomainUrls={config.selectedDomainUrls}
                        selectedEntryPointUrls={config.selectedEntryPointUrls}
                        selectedSitemapUrls={config.selectedSitemapUrls} />
                    </React.Fragment>
                  }
                })}
                < CrawlCustomSettingsFlyoutMultipleCrawlDelete />
              </>
            }
          </>
        )}
      </EuiFlyoutBody>
      <EuiFlyoutFooter>
        <EuiFlexGroup justifyContent="flexEnd">
          <EuiFlexItem grow={false}>
            <EuiButtonEmpty
              data-telemetry-id="entSearchContent-crawler-customCrawlSettings-cancelStartCrawl"
              onClick={hideFlyout}
            >
              {CANCEL_BUTTON_LABEL}
            </EuiButtonEmpty>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiButton
              data-telemetry-id="entSearchContent-crawler-customCrawlSettings-startCrawl"
              fill
              onClick={startCustomCrawl}
              disabled={isDataLoading}
              isLoading={isFormSubmitting}
            >
              {crawlType === CustomCrawlType.MULTIPLE ?
                i18n.translate(
                  'xpack.enterpriseSearch.crawler.crawlCustomSettingsFlyout.saveMultipleCrawlSchedules',
                  {
                    defaultMessage: 'Save multiple schedules',
                  }
                ) : i18n.translate(
                  'xpack.enterpriseSearch.crawler.crawlCustomSettingsFlyout.startCrawlButtonLabel',
                  {
                    defaultMessage: 'Apply and crawl now',
                  }
                )
              }
            </EuiButton>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiFlyoutFooter>
    </EuiFlyout>
  );
};
