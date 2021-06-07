/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect } from 'react';

import { useActions, useValues } from 'kea';

import { EuiCode, EuiPageHeader } from '@elastic/eui';

import { FlashMessages } from '../../../shared/flash_messages';

import { Loading } from '../../../shared/loading';

import { CRAWLER_TITLE } from './constants';
import { CrawlerOverviewLogic } from './crawler_overview_logic';

export const CrawlerOverview: React.FC = () => {
  const { dataLoading, domains } = useValues(CrawlerOverviewLogic);

  const { fetchCrawlerData } = useActions(CrawlerOverviewLogic);

  useEffect(() => {
    fetchCrawlerData();
  }, []);

  if (dataLoading) {
    return <Loading />;
  }

  return (
    <>
      <EuiPageHeader pageTitle={CRAWLER_TITLE} />
      <FlashMessages />
      <EuiCode language="json">{JSON.stringify(domains, null, 2)}</EuiCode>
    </>
  );
};
