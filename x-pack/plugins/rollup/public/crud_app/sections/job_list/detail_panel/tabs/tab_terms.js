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
} from '@elastic/eui';

export const TabTerms = ({ terms }) => {
  // TODO: Render a table if there are more than 20 fields.

  const renderedTerms = terms.fields.map(field => {
    return (
      <li key={field}>
        {field}
      </li>
    );
  });

  return (
    <Fragment>
      <EuiTitle size="s">
        <h3>Terms</h3>
      </EuiTitle>

      <EuiSpacer size="s" />

      <EuiText>
        <ul>
          {renderedTerms}
        </ul>
      </EuiText>
    </Fragment>
  );
};
