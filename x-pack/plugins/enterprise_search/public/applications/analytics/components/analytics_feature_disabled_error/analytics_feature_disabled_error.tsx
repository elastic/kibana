/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import { EuiEmptyPrompt } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { KibanaPageTemplate } from '@kbn/shared-ux-page-kibana-template';

export const AnalyticsFeatureDisabledError: React.FC = () => {
  return (
    <KibanaPageTemplate isEmptyState>
      <EuiEmptyPrompt
        iconType="alert"
        iconColor="danger"
        title={
          <h2>
            {i18n.translate('xpack.enterpriseSearch.analytics.featureDisabledState.title', {
              defaultMessage: 'Behavioural Analytics is disabled',
            })}
          </h2>
        }
        titleSize="l"
      />
    </KibanaPageTemplate>
  );
};
