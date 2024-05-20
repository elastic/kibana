/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import { useValues, useActions } from 'kea';

import { EuiFlexGroup, EuiFlexItem } from '@elastic/eui';

import { Status } from '../../../../../../common/types/api';
import { docLinks } from '../../../../shared/doc_links';
import { HttpLogic } from '../../../../shared/http';
import { KibanaLogic } from '../../../../shared/kibana';
import { LicensingLogic } from '../../../../shared/licensing';
import {
  LicensingCallout,
  LICENSING_FEATURE,
} from '../../../../shared/licensing_callout/licensing_callout';
import { CreateCrawlerIndexApiLogic } from '../../../api/crawler/create_crawler_index_api_logic';
import { CannotConnect } from '../../search_index/components/cannot_connect';
import { NewSearchIndexTemplate } from '../new_search_index_template';

import { MethodCrawlerLogic } from './method_crawler_logic';

export const MethodCrawler: React.FC = () => {
  const { status } = useValues(CreateCrawlerIndexApiLogic);
  const { makeRequest } = useActions(CreateCrawlerIndexApiLogic);
  const { isCloud } = useValues(KibanaLogic);
  const { hasPlatinumLicense } = useValues(LicensingLogic);
  const { errorConnectingMessage } = useValues(HttpLogic);

  const isGated = !isCloud && !hasPlatinumLicense;

  MethodCrawlerLogic.mount();

  return (
    <EuiFlexGroup direction="column">
      {isGated && (
        <EuiFlexItem>
          <LicensingCallout feature={LICENSING_FEATURE.CRAWLER} />
        </EuiFlexItem>
      )}
      {Boolean(errorConnectingMessage) && (
        <EuiFlexItem>
          <CannotConnect />
        </EuiFlexItem>
      )}
      <EuiFlexItem>
        <NewSearchIndexTemplate
          type="crawler"
          onSubmit={(indexName, language) => makeRequest({ indexName, language })}
          disabled={isGated || Boolean(errorConnectingMessage)}
          buttonLoading={status === Status.LOADING}
          docsUrl={docLinks.crawlerOverview}
        />
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};
