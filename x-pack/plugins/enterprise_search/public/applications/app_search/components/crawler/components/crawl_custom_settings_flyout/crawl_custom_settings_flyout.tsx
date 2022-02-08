/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import { useValues, useActions } from 'kea';

import {
  EuiAccordion,
  EuiButton,
  EuiButtonEmpty,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFlyout,
  EuiFlyoutBody,
  EuiFlyoutFooter,
  EuiFlyoutHeader,
  EuiIcon,
  EuiNotificationBadge,
  EuiPanel,
  EuiSpacer,
  EuiText,
  EuiTitle,
  useGeneratedHtmlId,
} from '@elastic/eui';

import { i18n } from '@kbn/i18n';

import { CANCEL_BUTTON_LABEL } from '../../../../../shared/constants';

import { CrawlerLogic } from '../../crawler_logic';

import { SimplifiedSelectable } from '../crawl_select_domains_modal/simplified_selectable';

import { CrawlCustomSettingsFlyoutLogic } from './crawl_custom_settings_flyout_logic';

export const CrawlCustomSettingsFlyout: React.FC = () => {
  const { domains } = useValues(CrawlerLogic);
  const domainUrls = domains.map((domain) => domain.url);

  const crawlCustomSettingsFlyoutLogic = CrawlCustomSettingsFlyoutLogic({ domains });
  const { isDataLoading, isFlyoutVisible, selectedDomainUrls } = useValues(
    crawlCustomSettingsFlyoutLogic
  );
  const { hideFlyout, onSelectDomainUrls } = useActions(crawlCustomSettingsFlyoutLogic);

  const { startCrawl } = useActions(CrawlerLogic);

  const domainAccordionId = useGeneratedHtmlId({ prefix: 'domainAccordion' });

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
        <EuiPanel hasBorder>
          <EuiAccordion
            id={domainAccordionId}
            initialIsOpen
            buttonContent={
              <EuiFlexGroup direction="row" responsive={false} gutterSize="s" alignItems="center">
                <EuiFlexItem grow={false}>
                  <EuiIcon type="globe" />
                </EuiFlexItem>
                <EuiFlexItem>
                  <EuiTitle size="xs">
                    <h3>
                      {i18n.translate(
                        'xpack.enterpriseSearch.appSearch.crawler.crawlCustomSettingsFlyout.domainsAccordionButtonLabel',
                        {
                          defaultMessage: 'Add domains to your crawl',
                        }
                      )}
                    </h3>
                  </EuiTitle>
                </EuiFlexItem>
              </EuiFlexGroup>
            }
            extraAction={
              <EuiFlexGroup alignItems="center" gutterSize="m">
                <EuiNotificationBadge
                  size="m"
                  color={selectedDomainUrls.length > 0 ? 'accent' : 'subdued'}
                >
                  {selectedDomainUrls.length}
                </EuiNotificationBadge>
                <EuiFlexItem grow={false}>
                  {i18n.translate(
                    'xpack.enterpriseSearch.appSearch.crawler.cralCustomSettingsFlyout.selectedDescriptor',
                    {
                      defaultMessage: 'selected',
                    }
                  )}
                </EuiFlexItem>
              </EuiFlexGroup>
            }
          >
            <SimplifiedSelectable
              options={domainUrls}
              selectedOptions={selectedDomainUrls}
              onChange={onSelectDomainUrls}
            />
          </EuiAccordion>
        </EuiPanel>
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
              disabled={selectedDomainUrls.length === 0}
              isLoading={isDataLoading}
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
