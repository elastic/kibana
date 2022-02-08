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

import { CrawlerLogic } from '../../crawler_logic';

import { CrawlCustomSettingsFlyoutContent } from './crawl_custom_settings_flyout_content';
import { CrawlCustomSettingsFlyoutLogic } from './crawl_custom_settings_flyout_logic';

export const CrawlCustomSettingsFlyout: React.FC = () => {
  const { isDataLoading, isFormSubmitting, isFlyoutVisible, selectedDomainUrls } = useValues(
    CrawlCustomSettingsFlyoutLogic
  );
  const { hideFlyout } = useActions(CrawlCustomSettingsFlyoutLogic);

  const { startCrawl } = useActions(CrawlerLogic);

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
        {isDataLoading ? <Loading /> : <CrawlCustomSettingsFlyoutContent />}
      </EuiFlyoutBody>
      <EuiFlyoutFooter>
        <EuiFlexGroup justifyContent="flexEnd">
          <EuiFlexItem grow={false}>
            <EuiButtonEmpty onClick={hideFlyout}>{CANCEL_BUTTON_LABEL}</EuiButtonEmpty>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiButton
              fill
              onClick={() => {
                startCrawl({ domain_allowlist: selectedDomainUrls });
              }}
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
