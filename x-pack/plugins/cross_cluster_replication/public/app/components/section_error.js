/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { Fragment } from 'react';
import {
  EuiCallOut,
  EuiSpacer,
} from '@elastic/eui';

export function SectionError(props) {
  const { title, error, ...rest } = props;
  const data = error.data ? error.data : error;
  const {
    error: errorString,
    cause, // wrapEsError() on the server add a "cause" array
    message,
  } = data;

  return (
    <EuiCallOut
      title={title}
      color="danger"
      iconType="alert"
      {...rest}
    >
      <div>{message || errorString}</div>
      { cause && (
        <Fragment>
          <EuiSpacer size="m" />
          <ul>
            { cause.map((message, i) => <li key={i}>{message}</li>) }
          </ul>
        </Fragment>
      )}
    </EuiCallOut>
  );
}
