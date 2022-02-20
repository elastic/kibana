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

import { CrawlerLogic } from '../../crawler_logic';

import { CrawlCustomSettingsFlyoutLogic } from '../crawl_custom_settings_flyout/crawl_custom_settings_flyout_logic';
import { CrawlSelectDomainsModalLogic } from '../crawl_select_domains_modal/crawl_select_domains_modal_logic';

interface Props {
  menuButtonLabel?: string;
  fill?: boolean;
}

export const StartCrawlContextMenu: React.FC<Props> = ({ menuButtonLabel, fill }) => {
  const { startCrawl } = useActions(CrawlerLogic);
  const { showModal: showCrawlSelectDomainsModal } = useActions(CrawlSelectDomainsModalLogic);
  const { showFlyout: showCrawlCustomSettingsFlyout } = useActions(CrawlCustomSettingsFlyoutLogic);
  const [isPopoverOpen, setPopover] = useState(false);

  const togglePopover = () => setPopover(!isPopoverOpen);

  const closePopover = () => setPopover(false);

  return (
    <EuiPopover
      button={
        <EuiButton iconType="arrowDown" iconSide="right" onClick={togglePopover} fill={fill}>
          {menuButtonLabel}
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
          >
            {i18n.translate(
              'xpack.enterpriseSearch.appSearch.crawler.startCrawlContextMenu.crawlAllDomainsMenuLabel',
              {
                defaultMessage: 'Crawl all domains on this engine',
              }
            )}
          </EuiContextMenuItem>,
          <EuiContextMenuItem
            key="crawl select domains"
            onClick={() => {
              closePopover();
              showCrawlSelectDomainsModal();
            }}
          >
            {i18n.translate(
              'xpack.enterpriseSearch.appSearch.crawler.startCrawlContextMenu.crawlSelectDomainsMenuLabel',
              {
                defaultMessage: 'Crawl select domains',
              }
            )}
          </EuiContextMenuItem>,
          <EuiContextMenuItem
            key="crawl with custom settings"
            onClick={() => {
              closePopover();
              showCrawlCustomSettingsFlyout();
            }}
          >
            {i18n.translate(
              'xpack.enterpriseSearch.appSearch.crawler.startCrawlContextMenu.crawlCustomSettingsMenuLabel',
              {
                defaultMessage: 'Crawl with custom settings',
              }
            )}
          </EuiContextMenuItem>,
        ]}
      />
    </EuiPopover>
  );
};
