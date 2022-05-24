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

import { CrawlCustomSettingsFlyoutCrawlDepthPanel } from './crawl_custom_settings_flyout_crawl_depth_panel';
import { CrawlCustomSettingsFlyoutDomainsPanel } from './crawl_custom_settings_flyout_domains_panel';
import { CrawlCustomSettingsFlyoutLogic } from './crawl_custom_settings_flyout_logic';
import { CrawlCustomSettingsFlyoutSeedUrlsPanel } from './crawl_custom_settings_flyout_seed_urls_panel';

export const CrawlCustomSettingsFlyout: React.FC = () => {
  const { isDataLoading, isFormSubmitting, isFlyoutVisible, selectedDomainUrls } = useValues(
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
              'xpack.enterpriseSearch.appSearch.crawler.crawlCustomSettingsFlyout.flyoutHeadTitle',
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
              'xpack.enterpriseSearch.appSearch.crawler.crawlCustomSettingsFlyout.flyoutHeaderDescription',
              {
                defaultMessage: 'Set up a one-time crawl with custom settings.',
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
            <CrawlCustomSettingsFlyoutCrawlDepthPanel />
            <EuiSpacer />
            <CrawlCustomSettingsFlyoutDomainsPanel />
            <EuiSpacer />
            <CrawlCustomSettingsFlyoutSeedUrlsPanel />
          </>
        )}
      </EuiFlyoutBody>
      <EuiFlyoutFooter>
        <EuiFlexGroup justifyContent="flexEnd">
          <EuiFlexItem grow={false}>
            <EuiButtonEmpty onClick={hideFlyout}>{CANCEL_BUTTON_LABEL}</EuiButtonEmpty>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiButton
              fill
              onClick={startCustomCrawl}
              disabled={isDataLoading || selectedDomainUrls.length === 0}
              isLoading={isFormSubmitting}
            >
              {i18n.translate(
                'xpack.enterpriseSearch.appSearch.crawler.crawlCustomSettingsFlyout.startCrawlButtonLabel',
                {
                  defaultMessage: 'Apply and crawl now',
                }
              )}
            </EuiButton>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiFlyoutFooter>
    </EuiFlyout>
  );
};
