/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState } from 'react';

import { useActions } from 'kea';

import {
  EuiButton,
  EuiContextMenuItem,
  EuiContextMenuPanel,
  EuiFlexGroup,
  EuiFlexItem,
  EuiLoadingSpinner,
  EuiPopover,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';

import { CrawlerLogic } from '../../search_index/crawler/crawler_logic';

export const StopCrawlPopoverContextMenu: React.FC = () => {
  const [isPopoverOpen, setPopover] = useState(false);

  const togglePopover = () => setPopover(!isPopoverOpen);

  const closePopover = () => setPopover(false);

  const { stopCrawl } = useActions(CrawlerLogic);

  return (
    <EuiPopover
      button={
        <EuiButton
          iconType="arrowDown"
          iconSide="right"
          onClick={togglePopover}
          className="crawlInProgressButton"
        >
          <EuiFlexGroup alignItems="center" responsive={false} gutterSize="s">
            <EuiFlexItem grow={false}>
              <EuiLoadingSpinner size="m" />
            </EuiFlexItem>
            <EuiFlexItem>
              {i18n.translate(
                'xpack.enterpriseSearch.crawler.crawlerStatusIndicator.crawlingButtonLabel',
                {
                  defaultMessage: 'Crawling...',
                }
              )}
            </EuiFlexItem>
          </EuiFlexGroup>
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
            key="cancel crawl"
            icon="cross"
            onClick={() => {
              closePopover();
              stopCrawl();
            }}
          >
            {i18n.translate(
              'xpack.enterpriseSearch.crawler.crawlerStatusIndicator.cancelCrawlMenuItemLabel',
              {
                defaultMessage: 'Cancel Crawls',
              }
            )}
          </EuiContextMenuItem>,
        ]}
      />
    </EuiPopover>
  );
};
