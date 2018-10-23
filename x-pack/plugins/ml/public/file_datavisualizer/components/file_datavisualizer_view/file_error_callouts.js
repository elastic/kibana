/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';

import {
  EuiCallOut,
} from '@elastic/eui';

export function FileTooLarge({ fileSize, maxFileSize }) {
  return (
    <EuiCallOut
      title="File size is too large"
      color="danger"
      iconType="cross"
    >
      <p>
        The size of the file you selected for upload is {fileSize} which exceeds the maximum permitted size of {maxFileSize}
      </p>
    </EuiCallOut>
  );
}

export function FileCouldNotBeRead({ error, loaded }) {
  return (
    <EuiCallOut
      title="File could not be read"
      color="danger"
      iconType="cross"
    >
      {
        (error !== undefined) &&
        <p>{error}</p>
      }
      {
        loaded &&
        <p>Reverting to previous settings</p>
      }
    </EuiCallOut>
  );
}
