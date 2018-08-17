/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { Fragment } from 'react';

import {
  EuiDescriptionList,
  EuiTitle,
  EuiSpacer,
} from '@elastic/eui';

export const TabMetrics = ({ metrics }) => {
  // TODO: Render a table if there are more than 20 metrics.
  const listMetrics = metrics.map(metric => {
    const {
      field,
      metrics: aggTypes,
    } = metric;

    return {
      title: field,
      description: aggTypes.join(', '),
    };
  });

  return (
    <Fragment>
      <EuiTitle size="s">
        <h3>Metrics</h3>
      </EuiTitle>

      <EuiSpacer size="s" />

      <EuiDescriptionList listItems={listMetrics} />
    </Fragment>
  );
};
