/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React from 'react';

import { useActions, useValues } from 'kea';

import {
  EuiFlyout,
  EuiFlyoutHeader,
  EuiTitle,
  EuiFlyoutBody,
  EuiCodeBlock,
  EuiTab,
  EuiTabs,
} from '@elastic/eui';

import { i18n } from '@kbn/i18n';

import { Loading } from '../../../../../shared/loading';

import { CrawlDetailLogic } from './crawl_detail_logic';

import { CrawlDetailsPreview } from './crawl_details_preview';

export const CrawlDetailsFlyout: React.FC = () => {
  const { closeFlyout, setSelectedTab } = useActions(CrawlDetailLogic);
  const { crawlRequestFromServer, dataLoading, flyoutClosed, selectedTab } =
    useValues(CrawlDetailLogic);

  if (flyoutClosed) {
    return null;
  }

  return (
    <EuiFlyout
      maxWidth="45rem"
      ownFocus
      onClose={closeFlyout}
      aria-labelledby="CrawlDetailsFlyoutTitle"
    >
      <EuiFlyoutHeader hasBorder>
        <EuiTitle size="m">
          <h2 id="CrawlDetailsFlyoutTitle">
            {i18n.translate('xpack.enterpriseSearch.crawler.crawlDetailsFlyout.title', {
              defaultMessage: 'Crawl request details',
            })}
          </h2>
        </EuiTitle>
        <EuiTabs style={{ marginBottom: '-25px' }}>
          <EuiTab isSelected={selectedTab === 'preview'} onClick={() => setSelectedTab('preview')}>
            {i18n.translate('xpack.enterpriseSearch.crawler.crawlDetailsFlyout.previewTabLabel', {
              defaultMessage: 'Preview',
            })}
          </EuiTab>
          <EuiTab isSelected={selectedTab === 'json'} onClick={() => setSelectedTab('json')}>
            {i18n.translate('xpack.enterpriseSearch.crawler.crawlDetailsFlyout.rawJSONTabLabel', {
              defaultMessage: 'Raw JSON',
            })}
          </EuiTab>
        </EuiTabs>
      </EuiFlyoutHeader>
      <EuiFlyoutBody>
        {dataLoading ? (
          <Loading />
        ) : (
          <>
            {selectedTab === 'preview' && <CrawlDetailsPreview />}
            {selectedTab === 'json' && (
              <EuiCodeBlock language="json" isCopyable>
                {JSON.stringify(crawlRequestFromServer, null, 2)}
              </EuiCodeBlock>
            )}
          </>
        )}
      </EuiFlyoutBody>
    </EuiFlyout>
  );
};
