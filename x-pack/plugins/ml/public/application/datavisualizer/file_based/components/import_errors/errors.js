/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { FormattedMessage } from '@kbn/i18n/react';
import React from 'react';

import { EuiCallOut, EuiAccordion } from '@elastic/eui';

import { IMPORT_STATUS } from '../import_progress';

export function ImportErrors({ errors, statuses }) {
  return (
    <EuiCallOut title={title(statuses)} color="danger" iconType="cross">
      {errors.map((e, i) => (
        <ImportError error={e} key={i} />
      ))}
    </EuiCallOut>
  );
}

function title(statuses) {
  switch (IMPORT_STATUS.FAILED) {
    case statuses.readStatus:
      return (
        <FormattedMessage
          id="xpack.ml.fileDatavisualizer.importErrors.readingFileErrorMessage"
          defaultMessage="Error reading file"
        />
      );
    case statuses.parseJSONStatus:
      return (
        <FormattedMessage
          id="xpack.ml.fileDatavisualizer.importErrors.parsingJSONErrorMessage"
          defaultMessage="Error parsing JSON"
        />
      );
    case statuses.indexCreatedStatus:
      return (
        <FormattedMessage
          id="xpack.ml.fileDatavisualizer.importErrors.creatingIndexErrorMessage"
          defaultMessage="Error creating index"
        />
      );
    case statuses.ingestPipelineCreatedStatus:
      return (
        <FormattedMessage
          id="xpack.ml.fileDatavisualizer.importErrors.creatingIngestPipelineErrorMessage"
          defaultMessage="Error creating ingest pipeline"
        />
      );
    case statuses.uploadStatus:
      return (
        <FormattedMessage
          id="xpack.ml.fileDatavisualizer.importErrors.uploadingDataErrorMessage"
          defaultMessage="Error uploading data"
        />
      );
    case statuses.indexPatternCreatedStatus:
      return (
        <FormattedMessage
          id="xpack.ml.fileDatavisualizer.importErrors.creatingIndexPatternErrorMessage"
          defaultMessage="Error creating index pattern"
        />
      );
    case statuses.permissionCheckStatus:
      return (
        <FormattedMessage
          id="xpack.ml.fileDatavisualizer.importErrors.checkingPermissionErrorMessage"
          defaultMessage="Import permissions error"
        />
      );
    default:
      return (
        <FormattedMessage
          id="xpack.ml.fileDatavisualizer.importErrors.defaultErrorMessage"
          defaultMessage="Error"
        />
      );
  }
}

function ImportError(error, key) {
  const errorObj = toString(error);
  return (
    <React.Fragment>
      <p key={key}>{errorObj.msg}</p>

      {errorObj.more !== undefined && (
        <EuiAccordion
          id="more"
          buttonContent={
            <FormattedMessage
              id="xpack.ml.fileDatavisualizer.importErrors.moreButtonLabel"
              defaultMessage="More"
            />
          }
          paddingSize="m"
        >
          {errorObj.more}
        </EuiAccordion>
      )}
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

        if (error.error.message !== undefined) {
          // this will catch javascript errors such as JSON parsing issues
          return { msg: error.error.message };
        }
      } else {
        return { msg: error.error };
      }
    } else {
      // last resort, just display the whole object
      return { msg: JSON.stringify(error) };
    }
  }

  return {
    msg: (
      <FormattedMessage
        id="xpack.ml.fileDatavisualizer.importErrors.unknownErrorMessage"
        defaultMessage="Unknown error"
      />
    ),
  };
}
