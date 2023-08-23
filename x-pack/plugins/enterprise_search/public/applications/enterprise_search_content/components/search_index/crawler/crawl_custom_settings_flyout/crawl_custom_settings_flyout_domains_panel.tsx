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
  EuiFlexGroup,
  EuiFlexItem,
  EuiIcon,
  EuiNotificationBadge,
  EuiPanel,
  EuiTitle,
  useGeneratedHtmlId,
} from '@elastic/eui';

import { i18n } from '@kbn/i18n';

import { SimplifiedSelectable } from '../../../../../shared/simplified_selectable/simplified_selectable';

import { CrawlCustomSettingsFlyoutLogic } from './crawl_custom_settings_flyout_logic';

interface CrawlCustomSettingsFlyoutDomainsPanelProps {
  domainUrls: string[];
  selectedDomainUrls: string[];
  onSelectDomainUrls: (selectedUrls: string[]) => void;
}

export const CrawlCustomSettingsFlyoutDomainsPanelWithLogicProps: React.FC = () => {
  const { domainUrls, selectedDomainUrls } = useValues(CrawlCustomSettingsFlyoutLogic);
  const { onSelectDomainUrls } = useActions(CrawlCustomSettingsFlyoutLogic);

  return (
    <CrawlCustomSettingsFlyoutDomainsPanel
      domainUrls={domainUrls}
      selectedDomainUrls={selectedDomainUrls}
      onSelectDomainUrls={onSelectDomainUrls}
    />
  );
};

export const CrawlCustomSettingsFlyoutDomainsPanel: React.FC<
  CrawlCustomSettingsFlyoutDomainsPanelProps
> = ({ domainUrls, selectedDomainUrls, onSelectDomainUrls }) => {
  return (
    <EuiPanel hasBorder>
      <EuiAccordion
        id={useGeneratedHtmlId({ prefix: 'domainAccordion' })}
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
                    'xpack.enterpriseSearch.crawler.crawlCustomSettingsFlyout.domainsAccordionButtonLabel',
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
                'xpack.enterpriseSearch.crawler.crawlCustomSettingsFlyout.selectedDescriptor',
                {
                  defaultMessage: 'selected',
                }
              )}
            </EuiFlexItem>
          </EuiFlexGroup>
        }
      >
        <SimplifiedSelectable
          data-telemetry-id="entSearchContent-crawler-customCrawlSettings-selectDomainUrls"
          options={domainUrls}
          selectedOptions={selectedDomainUrls}
          onChange={onSelectDomainUrls}
        />
      </EuiAccordion>
    </EuiPanel>
  );
};
