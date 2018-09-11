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
        File size uploaded is {fileSize}, the max file size for uploading to Kibana is {maxFileSize}
      </p>
    </EuiCallOut>
  );
}

export function FileCouldNotBeRead() {
  return (
    <EuiCallOut
      title="File size is too large"
      color="danger"
      iconType="cross"
    >
      <p>
        File could not be read.
      </p>
    </EuiCallOut>
  );
}
