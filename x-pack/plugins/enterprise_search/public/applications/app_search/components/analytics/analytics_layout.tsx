/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect } from 'react';
import { useParams } from 'react-router-dom';

import { useValues, useActions } from 'kea';

import { KibanaLogic } from '../../../shared/kibana';
import { AppSearchPageTemplate } from '../layout';

import { LogRetentionTooltip, LogRetentionCallout, LogRetentionOptions } from '../log_retention';

import { AnalyticsFilters } from './components';

import { AnalyticsLogic } from './';

interface Props {
  title: string;
  isQueryView?: boolean;
  isAnalyticsView?: boolean;
}
export const AnalyticsLayout: React.FC<Props> = ({
  title,
  isQueryView,
  isAnalyticsView,
  children,
}) => {
  const { history } = useValues(KibanaLogic);
  const { query } = useParams() as { query: string };
  const { dataLoading } = useValues(AnalyticsLogic);
  const { loadAnalyticsData, loadQueryData } = useActions(AnalyticsLogic);

  useEffect(() => {
    if (isQueryView) loadQueryData(query);
    if (isAnalyticsView) loadAnalyticsData();
  }, [history.location.search]);

  return (
    <AppSearchPageTemplate
      pageHeader={{
        pageTitle: title,
        rightSideItems: [
          <LogRetentionTooltip type={LogRetentionOptions.Analytics} position="left" />,
        ],
        children: <AnalyticsFilters />,
        responsive: false,
      }}
      isLoading={dataLoading}
    >
      <LogRetentionCallout type={LogRetentionOptions.Analytics} />
      {children}
    </AppSearchPageTemplate>
  );
};
