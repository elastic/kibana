/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { VFC } from 'react';
import { IndicatorsTable } from './components/indicators_table/indicators_table';
import { useIndicators } from './hooks/use_indicators';
import { EmptyPage } from '../../components/empty_page';
import { useIndicatorsTotalCount } from './hooks/use_indicators_total_count';
import { useIntegrationsPageLink } from '../../hooks/use_integrations_page_link';

export const IndicatorsPage: VFC = () => {
  const indicators = useIndicators();
  const { count: indicatorsTotalCount, isLoading: isIndicatorsTotalCountLoading } =
    useIndicatorsTotalCount();
  const showEmptyPage = !isIndicatorsTotalCountLoading && indicatorsTotalCount === 0;
  const integrationsPageLink = useIntegrationsPageLink();

  return showEmptyPage ? (
    <EmptyPage integrationsPageLink={integrationsPageLink} />
  ) : (
    <IndicatorsTable {...indicators} />
  );
};
