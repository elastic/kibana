/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { FormattedMessage } from '@kbn/i18n-react';
import React, { FC } from 'react';
import { i18n } from '@kbn/i18n';

import { EuiCallOut, EuiAccordion } from '@elastic/eui';

import { IMPORT_STATUS, Statuses } from '../import_progress';

interface ImportError {
  msg: string;
  more?: string;
}

interface Props {
  errors: any[];
  statuses: Statuses;
}

export const ImportErrors: FC<Props> = ({ errors, statuses }) => {
  return (
    <EuiCallOut title={title(statuses)} color="danger" iconType="cross">
      {errors.map((e, i) => (
        <ImportError error={e} key={i} />
      ))}
    </EuiCallOut>
  );
};

function title(statuses: Statuses) {
  switch (IMPORT_STATUS.FAILED) {
    case statuses.readStatus:
      return (
        <FormattedMessage
          id="xpack.dataVisualizer.file.importErrors.readingFileErrorMessage"
          defaultMessage="Error reading file"
        />
      );
    case statuses.parseJSONStatus:
      return (
        <FormattedMessage
          id="xpack.dataVisualizer.file.importErrors.parsingJSONErrorMessage"
          defaultMessage="Error parsing JSON"
        />
      );
    case statuses.indexCreatedStatus:
      return (
        <FormattedMessage
          id="xpack.dataVisualizer.file.importErrors.creatingIndexErrorMessage"
          defaultMessage="Error creating index"
        />
      );
    case statuses.ingestPipelineCreatedStatus:
      return (
        <FormattedMessage
          id="xpack.dataVisualizer.file.importErrors.creatingIngestPipelineErrorMessage"
          defaultMessage="Error creating ingest pipeline"
        />
      );
    case statuses.uploadStatus:
      return (
        <FormattedMessage
          id="xpack.dataVisualizer.file.importErrors.uploadingDataErrorMessage"
          defaultMessage="Error uploading data"
        />
      );
    case statuses.dataViewCreatedStatus:
      return (
        <FormattedMessage
          id="xpack.dataVisualizer.file.importErrors.creatingDataViewErrorMessage"
          defaultMessage="Error creating data view"
        />
      );
    case statuses.permissionCheckStatus:
      return (
        <FormattedMessage
          id="xpack.dataVisualizer.file.importErrors.checkingPermissionErrorMessage"
          defaultMessage="Import permissions error"
        />
      );
    default:
      return (
        <FormattedMessage
          id="xpack.dataVisualizer.file.importErrors.defaultErrorMessage"
          defaultMessage="Error"
        />
      );
  }
}

const ImportError: FC<{ error: any }> = ({ error }) => {
  const errorObj = toString(error);
  return (
    <>
      <p>{errorObj.msg}</p>

      {errorObj.more !== undefined && (
        <EuiAccordion
          id="more"
          buttonContent={
            <FormattedMessage
              id="xpack.dataVisualizer.file.importErrors.moreButtonLabel"
              defaultMessage="More"
            />
          }
          paddingSize="m"
        >
          {errorObj.more}
        </EuiAccordion>
      )}
    </>
  );
};

function toString(error: any): ImportError {
  if (typeof error === 'string') {
    return { msg: error };
  }

  if (typeof error === 'object') {
    if (error.msg !== undefined) {
      return { msg: error.msg };
    } else if (error.error !== undefined) {
      if (typeof error.error === 'object') {
        if (error.error.reason !== undefined) {
          // this will catch a bulk ingest failure
          const errorObj: ImportError = { msg: error.error.reason };
          if (error.error.root_cause !== undefined) {
            errorObj.more = JSON.stringify(error.error.root_cause);
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
    msg: i18n.translate('xpack.dataVisualizer.file.importErrors.unknownErrorMessage', {
      defaultMessage: 'Unknown error',
    }),
  };
}
