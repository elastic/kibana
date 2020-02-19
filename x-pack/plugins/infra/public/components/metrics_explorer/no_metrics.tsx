/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { FormattedMessage } from '@kbn/i18n/react';
import { EuiEmptyPrompt } from '@elastic/eui';

export const MetricsExplorerNoMetrics = () => {
  return (
    <EuiEmptyPrompt
      iconType="stats"
      title={
        <h3>
          <FormattedMessage
            id="xpack.infra.metricsExplorer.noMetrics.title"
            defaultMessage="Missing Metric"
          />
        </h3>
      }
      body={
        <p>
          <FormattedMessage
            id="xpack.infra.metricsExplorer.noMetrics.body"
            defaultMessage="Please choose a metric above."
          />
        </p>
      }
    />
  );
};
