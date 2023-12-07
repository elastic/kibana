/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import { useValues, useActions } from 'kea';

import { EuiFlexGroup, EuiFlexItem, EuiFormFieldset, EuiRadio } from '@elastic/eui';

import { i18n } from '@kbn/i18n';

import { CustomCrawlType } from '../../../../api/crawler/types';

import { CrawlCustomSettingsFlyoutLogic } from './crawl_custom_settings_flyout_logic';

export const CrawlCustomSettingsFlyoutCrawlTypeSelection: React.FC = () => {
  const { crawlType } = useValues(CrawlCustomSettingsFlyoutLogic);
  const { onSelectCrawlType } = useActions(CrawlCustomSettingsFlyoutLogic);

  return (
    <EuiFormFieldset
      legend={{
        children: i18n.translate(
          'xpack.enterpriseSearch.crawler.crawlCustomSettingsFlyout.crawlTypeGroupLabel',
          {
            defaultMessage: 'Crawl type',
          }
        ),
      }}
    >
      <EuiFlexGroup direction="row">
        <EuiFlexItem grow={false}>
          <EuiRadio
            id={CustomCrawlType.ONE_TIME}
            label={i18n.translate(
              'xpack.enterpriseSearch.crawler.crawlCustomSettingsFlyout.oneTimeCrawlRadioLabel',
              {
                defaultMessage: 'One-time crawl',
              }
            )}
            checked={crawlType === CustomCrawlType.ONE_TIME}
            onChange={() => onSelectCrawlType(CustomCrawlType.ONE_TIME)}
          />
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiRadio
            id={CustomCrawlType.MULTIPLE}
            label={i18n.translate(
              'xpack.enterpriseSearch.crawler.crawlCustomSettingsFlyout.multipleCrawlsRadioLabel',
              {
                defaultMessage: 'Multiple crawls',
              }
            )}
            checked={crawlType === CustomCrawlType.MULTIPLE}
            onChange={() => onSelectCrawlType(CustomCrawlType.MULTIPLE)}
          />
        </EuiFlexItem>
      </EuiFlexGroup>
    </EuiFormFieldset>
  );
};
