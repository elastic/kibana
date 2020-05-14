/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { Fragment } from 'react';
import { EuiCallOut, EuiSpacer } from '@elastic/eui';

export function SectionError(props) {
  const { title, error, ...rest } = props;
  const data = error.body ? error.body : error;
  const {
    error: errorString,
    attributes, // wrapEsError() on the server add a "cause" array
    message,
  } = data;

  return (
    <EuiCallOut title={title} color="danger" iconType="alert" {...rest}>
      <div>{message || errorString}</div>
      {attributes && attributes.cause && (
        <Fragment>
          <EuiSpacer size="m" />
          <ul>
            {attributes.cause.map((message, i) => (
              <li key={i}>{message}</li>
            ))}
          </ul>
        </Fragment>
      )}
    </EuiCallOut>
  );
}
