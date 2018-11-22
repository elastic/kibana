/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { Fragment } from 'react';
import {
  EuiSpacer,
  EuiCallOut,
} from '@elastic/eui';

export function SectionError({ title, error }) {
  const {
    statusCode,
    error: errorString,
    cause, // wrapEsError on the server add a "cause" array
  } = error.data;

  return (
    <Fragment>
      <EuiCallOut
        title={title}
        color="danger"
        iconType="alert"
      >
        <div>{statusCode} {errorString}</div>
        { cause && (
          <Fragment>
            <EuiSpacer size="m" />
            <ul>
              { cause.map(message => <li>{message}</li>) }
            </ul>
          </Fragment>
        )}
      </EuiCallOut>
      <EuiSpacer size="m" />
    </Fragment>
  );
}
