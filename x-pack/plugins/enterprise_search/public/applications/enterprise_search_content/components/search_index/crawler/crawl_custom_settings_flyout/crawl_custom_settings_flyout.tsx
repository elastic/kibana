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
} from '@elastic/eui';

import { i18n } from '@kbn/i18n';

import { CANCEL_BUTTON_LABEL } from '../../../../../shared/constants';
import { Loading } from '../../../../../shared/loading';

import { CrawlCustomSettingsFlyoutCrawlDepthPanelWithLogicProps } from './crawl_custom_settings_flyout_crawl_depth_panel';
import { CrawlCustomSettingsFlyoutCrawlTypeSelection } from './crawl_custom_settings_flyout_crawl_type_select';
import { CrawlCustomSettingsFlyoutDomainsPanelWithLogicProps } from './crawl_custom_settings_flyout_domains_panel';
import { CrawlCustomSettingsFlyoutLogic } from './crawl_custom_settings_flyout_logic';
import { CrawlCustomSettingsFlyoutMultipleCrawlDelete } from './crawl_custom_settings_flyout_multi_crawl_delete';
import { CrawlCustomSettingsFlyoutMultipleCrawlTabs } from './crawl_custom_settings_flyout_multi_crawl_tabs';
import { CrawlCustomSettingsFlyoutMultiCrawlScheduling } from './crawl_custom_settings_flyout_mutli_crawl';
import { CrawlCustomSettingsFlyoutSeedUrlsPanelWithLogicProps } from './crawl_custom_settings_flyout_seed_urls_panel';

export const CrawlCustomSettingsFlyout: React.FC = () => {
  const {
    isDataLoading,
    isFormSubmitting,
    isFlyoutVisible,
    isSingleCrawlType,
    selectedDomainUrls,
  } = useValues(CrawlCustomSettingsFlyoutLogic);
  const { hideFlyout, startCustomCrawl, saveCustomSchedulingConfiguration } = useActions(
    CrawlCustomSettingsFlyoutLogic
  );

  if (!isFlyoutVisible) {
    return null;
  }

  const submitFunctionLogic = isSingleCrawlType
    ? startCustomCrawl
    : saveCustomSchedulingConfiguration;

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
            {isSingleCrawlType ? (
              <>
                <CrawlCustomSettingsFlyoutCrawlDepthPanelWithLogicProps />
                <EuiSpacer />
                <CrawlCustomSettingsFlyoutDomainsPanelWithLogicProps />
                <EuiSpacer />
                <CrawlCustomSettingsFlyoutSeedUrlsPanelWithLogicProps />
              </>
            ) : (
              <>
                <CrawlCustomSettingsFlyoutMultipleCrawlTabs />
                <EuiSpacer />
                <CrawlCustomSettingsFlyoutMultiCrawlScheduling />
                <EuiSpacer />
                <CrawlCustomSettingsFlyoutMultipleCrawlDelete />
              </>
            )}
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
              onClick={submitFunctionLogic}
              disabled={isDataLoading || selectedDomainUrls.length === 0}
              isLoading={isFormSubmitting}
            >
              {isSingleCrawlType
                ? i18n.translate(
                    'xpack.enterpriseSearch.crawler.crawlCustomSettingsFlyout.startCrawlButtonLabel',
                    {
                      defaultMessage: 'Apply and crawl now',
                    }
                  )
                : i18n.translate(
                    'xpack.enterpriseSearch.crawler.crawlCustomSettingsFlyout.saveMultipleCrawlersConfiguration',
                    {
                      defaultMessage: 'Save configuration',
                    }
                  )}
            </EuiButton>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiFlyoutFooter>
    </EuiFlyout>
  );
};
