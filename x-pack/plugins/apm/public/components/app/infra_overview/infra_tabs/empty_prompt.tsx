/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiEmptyPrompt } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import React from 'react';

export function EmptyPrompt() {
  return (
    <EuiEmptyPrompt
      iconType="eyeClosed"
      iconColor="subdued"
      title={
        <h2>
          {i18n.translate('xpack.apm.infraTabs.noMetricsPromptTitle', {
            defaultMessage: 'No infrastructure data available',
          })}
        </h2>
      }
      body={
        <p>
          {i18n.translate('xpack.apm.infraTabs.noMetricsPromptDescription', {
            defaultMessage:
              'We can’t find any infrastructure data within the currently selected service and time range. Please try another time range. If you don’t have metrics data set up, please use our setup instructions to get started.',
          })}
        </p>
      }
      // actions={<SetupInstructionsLink buttonFill={true} />}
    />
  );
}
