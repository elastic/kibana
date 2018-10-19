/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */


import React from 'react';

import {
  EuiCallOut,
} from '@elastic/eui';

import { IMPORT_STATUS } from './import_progress';

export function Errors({ errors, statuses }) {
  return (
    <EuiCallOut
      title={title(statuses)}
      color="danger"
      iconType="cross"
    >
      {
        errors.map((e, i) => (
          <p key={i}>
            { toString(e) }
          </p>
        ))
      }

    </EuiCallOut>
  );
}

function title(statuses) {
  switch (IMPORT_STATUS.FAILED) {
    case statuses.readStatus:
      return 'Error reading file';
    case statuses.indexCreatedStatus:
      return 'Error creating index';
    case statuses.ingestPipelineCreatedStatus:
      return 'Error creating ingest pipeline';
    case statuses.uploadStatus:
      return 'Error uploading data';
    case statuses.indexPatternCreatedStatus:
      return 'Error creating index pattern';
    default:
      return 'Error';
  }
}

function toString(error) {
  if (typeof error === 'object') {
    if (error.msg !== undefined) {
      return error.msg;
    } else if (error.error !== undefined) {
      return error.error;
    } else {
      return error.toString();
    }
  }
  return error;
}
