/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React, { useState } from 'react';

import { useActions } from 'kea';

import { EuiButton, EuiContextMenuItem, EuiContextMenuPanel, EuiPopover } from '@elastic/eui';
import { i18n } from '@kbn/i18n';

import { CrawlCustomSettingsFlyoutLogic } from '../../search_index/crawler/crawl_custom_settings_flyout/crawl_custom_settings_flyout_logic';
import { CrawlerLogic } from '../../search_index/crawler/crawler_logic';

export const StartCrawlContextMenu: React.FC = () => {
  const { reApplyCrawlRules, startCrawl } = useActions(CrawlerLogic);
  const { showFlyout: showCrawlCustomSettingsFlyout } = useActions(CrawlCustomSettingsFlyoutLogic);
  const [isPopoverOpen, setPopover] = useState(false);

  const togglePopover = () => setPopover(!isPopoverOpen);
  const closePopover = () => setPopover(false);

  return (
    <EuiPopover
      button={
        <EuiButton iconType="arrowDown" iconSide="right" onClick={togglePopover} fill>
          {i18n.translate(
            'xpack.enterpriseSearch.crawler.crawlerStatusIndicator.retryCrawlButtonLabel',
            {
              defaultMessage: 'Crawl',
            }
          )}
        </EuiButton>
      }
      isOpen={isPopoverOpen}
      closePopover={closePopover}
      panelPaddingSize="none"
      anchorPosition="downLeft"
    >
      <EuiContextMenuPanel
        items={[
          <EuiContextMenuItem
            key="crawl all domains"
            onClick={() => {
              closePopover();
              startCrawl();
            }}
            icon="play"
          >
            {i18n.translate(
              'xpack.enterpriseSearch.crawler.startCrawlContextMenu.crawlAllDomainsMenuLabel',
              {
                defaultMessage: 'Crawl all domains on this index',
              }
            )}
          </EuiContextMenuItem>,
          <EuiContextMenuItem
            key="crawl with custom settings"
            onClick={() => {
              closePopover();
              showCrawlCustomSettingsFlyout();
            }}
            icon="gear"
          >
            {i18n.translate(
              'xpack.enterpriseSearch.crawler.startCrawlContextMenu.crawlCustomSettingsMenuLabel',
              {
                defaultMessage: 'Crawl with custom settings',
              }
            )}
          </EuiContextMenuItem>,
          <EuiContextMenuItem
            key="reaply crawl rules"
            onClick={() => {
              closePopover();
              reApplyCrawlRules();
            }}
            icon="refresh"
          >
            {i18n.translate(
              'xpack.enterpriseSearch.crawler.startCrawlContextMenu.reapplyCrawlRulesMenuLabel',
              {
                defaultMessage: 'Reapply crawl rules',
              }
            )}
          </EuiContextMenuItem>,
        ]}
      />
    </EuiPopover>
  );
};
