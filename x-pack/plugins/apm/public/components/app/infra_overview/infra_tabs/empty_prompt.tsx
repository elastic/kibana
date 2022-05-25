/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiEmptyPrompt, EuiPageTemplate } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import React from 'react';

export function EmptyPrompt() {
  return (
    <EuiPageTemplate
      pageContentProps={{
        color: 'transparent',
      }}
      template="centeredBody"
    >
      <EuiEmptyPrompt
        iconType="metricsApp"
        color="subdued"
        title={
          <h2>
            {i18n.translate('xpack.apm.infraTabs.noMetricsPromptTitle', {
              defaultMessage: 'No infrastructure data found',
            })}
          </h2>
        }
        titleSize="m"
        body={
          <p>
            {i18n.translate('xpack.apm.infraTabs.noMetricsPromptDescription', {
              defaultMessage:
                'Try adjusting your time range or check if you have any metrics data set up.',
            })}
          </p>
        }
      />
    </EuiPageTemplate>
  );
}
