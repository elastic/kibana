/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */


import React from 'react';

import {
  EuiCallOut,
  EuiAccordion,
} from '@elastic/eui';

import { IMPORT_STATUS } from '../import_progress';

export function ImportErrors({ errors, statuses }) {
  return (
    <EuiCallOut
      title={title(statuses)}
      color="danger"
      iconType="cross"
    >
      {
        errors.map((e, i) => (
          <ImportError error={e} key={i} />
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

function ImportError(error, key) {
  const errorObj = toString(error);
  return (
    <React.Fragment>
      <p key={key}>
        { errorObj.msg }
      </p>

      {errorObj.more !== undefined &&
        <EuiAccordion
          id="more"
          buttonContent="More"
          paddingSize="m"
        >
          {errorObj.more}
        </EuiAccordion>
      }

    </React.Fragment>
  );
}

function toString(error) {
  if (typeof error === 'string') {
    return { msg: error };
  }

  if (typeof error === 'object') {
    if (error.msg !== undefined) {
      return { msg: error.msg };
    } else if (error.error !== undefined) {
      if (typeof error.error === 'object') {
        if (error.error.msg !== undefined) {
          // this will catch a bulk ingest failure
          const errorObj = { msg: error.error.msg };
          if (error.error.body !== undefined) {
            errorObj.more = error.error.response;
          }
          return errorObj;

        }
      } else {
        return { msg: error.error };
      }
    } else {
      // last resort, just display the whole object
      return { msg: JSON.stringify(error) };

    }
  }

  return { msg: 'Unknown error' };
}
