/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { Fragment } from 'react';

import {
  EuiTitle,
  EuiSpacer,
  EuiText,
  EuiFlexGroup,
  EuiFlexItem,
} from '@elastic/eui';

export const TabHistogram = ({ histogram }) => {
  const { interval, fields } = histogram;

  // TODO: Render a table if there are more than 20 fields.

  const renderedTerms = fields.map(field => {
    return (
      <li key={field}>
        {field}
      </li>
    );
  });

  return (
    <Fragment>
      <EuiFlexGroup alignItems="center" justifyContent="spaceBetween">
        <EuiFlexItem grow={false}>
          <EuiTitle size="s">
            <h3>Histogram</h3>
          </EuiTitle>
        </EuiFlexItem>

        <EuiFlexItem grow={false}>
          <EuiText>
            <p>Interval: {interval}</p>
          </EuiText>
        </EuiFlexItem>
      </EuiFlexGroup>

      <EuiSpacer size="s" />

      <EuiText>
        <ul>
          {renderedTerms}
        </ul>
      </EuiText>
    </Fragment>
  );
};
