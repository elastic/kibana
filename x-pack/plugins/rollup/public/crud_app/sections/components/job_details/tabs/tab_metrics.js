/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { Fragment } from 'react';
import { injectI18n, FormattedMessage } from '@kbn/i18n/react';

import {
  EuiDescriptionList,
  EuiTitle,
  EuiSpacer,
} from '@elastic/eui';

export const TabMetricsUi = ({ metrics }) => {
  // TODO: Render a table if there are more than 20 metrics.
  const listMetrics = metrics.map(({ name, types }) => {
    return {
      title: name,
      description: types.join(', '),
    };
  });

  return (
    <Fragment>
      <EuiTitle size="s">
        <h3>
          <FormattedMessage
            id="xpack.rollupJobs.jobDetails.tabMetrics.sectionMetrics.title"
            defaultMessage="Metrics"
          />
        </h3>
      </EuiTitle>

      <EuiSpacer size="s" />

      <EuiDescriptionList listItems={listMetrics} />
    </Fragment>
  );
};

export const TabMetrics = injectI18n(TabMetricsUi);
