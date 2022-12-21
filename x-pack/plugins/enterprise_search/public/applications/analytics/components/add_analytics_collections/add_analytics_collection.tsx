/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import { i18n } from '@kbn/i18n';

import { EnterpriseSearchAnalyticsPageTemplate } from '../layout/page_template';

import { AddAnalyticsCollectionForm } from './add_analytics_collection_form';

export const collectionsCreateBreadcrumbs = [
  i18n.translate('xpack.enterpriseSearch.analytics.collectionsCreate.breadcrumb', {
    defaultMessage: 'Create collection',
  }),
];

export const AddAnalyticsCollection: React.FC = () => {
  return (
    <EnterpriseSearchAnalyticsPageTemplate
      pageChrome={[...collectionsCreateBreadcrumbs]}
      restrictWidth
      pageViewTelemetry="Add Analytics Collection"
    >
      <AddAnalyticsCollectionForm />
    </EnterpriseSearchAnalyticsPageTemplate>
  );
};
