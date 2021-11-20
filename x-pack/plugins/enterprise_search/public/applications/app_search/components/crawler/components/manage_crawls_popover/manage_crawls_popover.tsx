/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import { useActions, useValues } from 'kea';

import { EuiButton, EuiContextMenu, EuiPopover } from '@elastic/eui';

import { i18n } from '@kbn/i18n';

import { CrawlerDomain } from '../../types';

import { AutomaticCrawlScheduler } from './automatic_crawl_scheduler';

import { ManageCrawlsPopoverLogic } from './manage_crawls_popover_logic';

interface ManageCrawlsPopoverProps {
  domain?: CrawlerDomain;
}

export const ManageCrawlsPopover: React.FC<ManageCrawlsPopoverProps> = ({ domain }) => {
  const { closePopover, reApplyCrawlRules, togglePopover } = useActions(ManageCrawlsPopoverLogic);

  const { isOpen } = useValues(ManageCrawlsPopoverLogic);

  const panels = [
    {
      id: 0,
      items: [
        {
          name: i18n.translate(
            'xpack.enterpriseSearch.appSearch.crawler.manageCrawlsPopover.reApplyCrawlRulesButtonLabel',
            { defaultMessage: 'Re-apply crawl rules' }
          ),
          icon: 'refresh',
          onClick: () => reApplyCrawlRules(domain),
        },
        {
          name: i18n.translate(
            'xpack.enterpriseSearch.appSearch.crawler.manageCrawlsPopover.automaticCrawlingButtonLabel',
            { defaultMessage: 'Automatic crawling' }
          ),
          icon: 'gear',
          panel: 1,
        },
      ],
    },
    {
      id: 1,
      title: i18n.translate(
        'xpack.enterpriseSearch.appSearch.crawler.manageCrawlsPopover.automaticCrawlingTitle',
        { defaultMessage: 'Automatic crawling' }
      ),
      width: 400,
      content: <AutomaticCrawlScheduler />,
    },
  ];

  return (
    <EuiPopover
      isOpen={isOpen}
      closePopover={closePopover}
      button={
        <EuiButton onClick={togglePopover} iconType="arrowDown" iconSide="right">
          {i18n.translate(
            'xpack.enterpriseSearch.appSearch.crawler.manageCrawlsPopover.manageCrawlsButtonLabel',
            { defaultMessage: 'Manage crawls' }
          )}
        </EuiButton>
      }
    >
      <EuiContextMenu initialPanelId={0} panels={panels} />
    </EuiPopover>
  );
};
