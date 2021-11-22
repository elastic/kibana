/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React from 'react';

import { useActions, useValues } from 'kea';

import { EuiFlyout, EuiFlyoutHeader, EuiTitle, EuiFlyoutBody, EuiCodeBlock } from '@elastic/eui';

import { i18n } from '@kbn/i18n';

import { Loading } from '../../../../shared/loading';
import { CrawlDetailLogic } from '../crawl_detail_logic';

export const CrawlDetailsFlyout: React.FC = () => {
  const { closeFlyout } = useActions(CrawlDetailLogic);
  const { dataLoading, flyoutClosed, crawlRequestFromServer } = useValues(CrawlDetailLogic);

  if (flyoutClosed) {
    return null;
  }

  return (
    <EuiFlyout ownFocus onClose={closeFlyout} aria-labelledby="CrawlDetailsFlyoutTitle">
      <EuiFlyoutHeader hasBorder>
        <EuiTitle size="m">
          <h2 id="CrawlDetailsFlyoutTitle">
            {i18n.translate('xpack.enterpriseSearch.appSearch.crawler.crawlDetailsFlyout.title', {
              defaultMessage: 'Crawl request details',
            })}
          </h2>
        </EuiTitle>
      </EuiFlyoutHeader>
      <EuiFlyoutBody>
        {dataLoading ? (
          <Loading />
        ) : (
          <EuiCodeBlock language="json">
            {JSON.stringify(crawlRequestFromServer, null, 2)}
          </EuiCodeBlock>
        )}
      </EuiFlyoutBody>
    </EuiFlyout>
  );
};
