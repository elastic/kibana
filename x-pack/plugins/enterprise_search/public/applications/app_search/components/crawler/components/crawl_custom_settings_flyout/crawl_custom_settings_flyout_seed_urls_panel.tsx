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
  EuiCheckbox,
  EuiFlexGroup,
  EuiFlexItem,
  EuiIcon,
  EuiNotificationBadge,
  EuiPanel,
  EuiSpacer,
  EuiTabbedContent,
  EuiTitle,
  useGeneratedHtmlId,
} from '@elastic/eui';

import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';

import { SimplifiedSelectable } from '../crawl_select_domains_modal/simplified_selectable';

import { CrawlCustomSettingsFlyoutLogic } from './crawl_custom_settings_flyout_logic';

export const CrawlCustomSettingsFlyoutSeedUrlsPanel: React.FC = () => {
  const {
    entryPointUrls,
    includeRobotsTxt,
    selectedDomainUrls,
    selectedEntryPointUrls,
    selectedSitemapUrls,
    sitemapUrls,
  } = useValues(CrawlCustomSettingsFlyoutLogic);
  const { onSelectEntryPointUrls, onSelectSitemapUrls, toggleIncludeRobotsTxt } = useActions(
    CrawlCustomSettingsFlyoutLogic
  );

  const totalSeedUrls = selectedEntryPointUrls.length + selectedSitemapUrls.length;

  return (
    <EuiPanel hasBorder>
      <EuiAccordion
        id={useGeneratedHtmlId({ prefix: 'seedUrlAccordion' })}
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
                      defaultMessage: 'Seed URLs',
                    }
                  )}
                </h3>
              </EuiTitle>
            </EuiFlexItem>
          </EuiFlexGroup>
        }
        extraAction={
          <EuiFlexGroup alignItems="center" gutterSize="m">
            <EuiNotificationBadge size="m" color={totalSeedUrls > 0 ? 'accent' : 'subdued'}>
              {totalSeedUrls}
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
        <EuiTabbedContent
          expand
          tabs={[
            {
              id: useGeneratedHtmlId({ prefix: 'sitemapsTab' }),
              name: i18n.translate(
                'xpack.enterpriseSearch.appSearch.crawler.crawlCustomSettingsFlyout.sitemapsTabLabel',
                {
                  defaultMessage: 'Sitemaps',
                }
              ),
              content: (
                <>
                  <EuiSpacer size="s" />
                  <EuiPanel color="subdued" borderRadius="none" hasShadow={false} paddingSize="s">
                    <EuiCheckbox
                      id={useGeneratedHtmlId({ prefix: 'includeRobotsCheckbox' })}
                      label={
                        <FormattedMessage
                          id="xpack.enterpriseSearch.appSearch.crawler.crawlCustomSettingsFlyout.includeSitemapsCheckboxLabel"
                          defaultMessage="Include sitemaps discovered in {robotsDotTxt}"
                          values={{
                            robotsDotTxt: <strong>robots.txt</strong>, // this is a technical term and shouldn't be translated
                          }}
                        />
                      }
                      checked={includeRobotsTxt}
                      onChange={toggleIncludeRobotsTxt}
                    />
                  </EuiPanel>
                  <SimplifiedSelectable
                    options={sitemapUrls}
                    selectedOptions={selectedSitemapUrls}
                    onChange={onSelectSitemapUrls}
                    emptyMessage={
                      selectedDomainUrls.length === 0
                        ? i18n.translate(
                            'xpack.enterpriseSearch.appSearch.crawler.crawlCustomSettingsFlyout.emptyDomainsMessage',
                            {
                              defaultMessage: 'Please select a domain.',
                            }
                          )
                        : undefined
                    }
                  />
                </>
              ),
            },
            {
              id: useGeneratedHtmlId({ prefix: 'entryPointsTab' }),
              name: i18n.translate(
                'xpack.enterpriseSearch.appSearch.crawler.crawlCustomSettingsFlyout.entryPointsTabLabel',
                {
                  defaultMessage: 'Entry points',
                }
              ),
              content: (
                <>
                  <EuiSpacer size="s" />
                  <SimplifiedSelectable
                    options={entryPointUrls}
                    selectedOptions={selectedEntryPointUrls}
                    onChange={onSelectEntryPointUrls}
                    emptyMessage={
                      selectedDomainUrls.length === 0
                        ? i18n.translate(
                            'xpack.enterpriseSearch.appSearch.crawler.crawlCustomSettingsFlyout.emptyDomainsMessage',
                            {
                              defaultMessage: 'Please select a domain.',
                            }
                          )
                        : undefined
                    }
                  />
                </>
              ),
            },
          ]}
          autoFocus="selected"
        />
      </EuiAccordion>
    </EuiPanel>
  );
};
