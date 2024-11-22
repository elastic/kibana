/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import { useValues } from 'kea';

import { i18n } from '@kbn/i18n';

import { KibanaLogic } from '../../shared/kibana';

import { EnterpriseSearchRelevancePageTemplate } from './layout/page_template';

export const InferenceEndpoints: React.FC = () => {
  const { searchInferenceEndpoints } = useValues(KibanaLogic);

  if (!searchInferenceEndpoints) {
    return null;
  }
  return (
    <searchInferenceEndpoints.InferenceEdnpointsProvider>
      <EnterpriseSearchRelevancePageTemplate
        pageChrome={[
          i18n.translate('xpack.enterpriseSearch.relevance.inferenceEndpoints.breadcrumb', {
            defaultMessage: 'Inference Endpoints',
          }),
        ]}
        pageViewTelemetry="InferenceEndpoints"
        restrictWidth={false}
        customPageSections
        bottomBorder="extended"
      >
        <searchInferenceEndpoints.InferenceEndpoints />
      </EnterpriseSearchRelevancePageTemplate>
    </searchInferenceEndpoints.InferenceEdnpointsProvider>
  );
};
