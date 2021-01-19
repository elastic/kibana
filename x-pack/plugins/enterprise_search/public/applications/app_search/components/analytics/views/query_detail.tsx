/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { useParams } from 'react-router-dom';
import { i18n } from '@kbn/i18n';

import { SetAppSearchChrome as SetPageChrome } from '../../../../shared/kibana_chrome';
import { BreadcrumbTrail } from '../../../../shared/kibana_chrome/generate_breadcrumbs';

import { AnalyticsLayout } from '../analytics_layout';

const QUERY_DETAIL_TITLE = i18n.translate(
  'xpack.enterpriseSearch.appSearch.engine.analytics.queryDetail.title',
  { defaultMessage: 'Query' }
);

interface Props {
  breadcrumbs: BreadcrumbTrail;
}
export const QueryDetail: React.FC<Props> = ({ breadcrumbs }) => {
  const { query } = useParams() as { query: string };

  return (
    <AnalyticsLayout isQueryView title={`"${query}"`}>
      <SetPageChrome trail={[...breadcrumbs, QUERY_DETAIL_TITLE, query]} />

      <p>TODO: Query detail page</p>
    </AnalyticsLayout>
  );
};
