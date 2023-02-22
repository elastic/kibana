/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { capitalize } from 'lodash';
import { EuiCallOut, EuiSpacer } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';

// All error types come directly from ES with the form `zzzz_xxxx_exception`,
// this function will take such string, and sanitaze it in a way that can be
// more user friendly to show directly to users.
const sanitizeErrorType = (error: string) => {
  return capitalize(error.replace('_exception', '').replace('_', ' '));
};

export interface SnapshotErrorType {
  errors: Record<
    string,
    {
      type: string;
      reason: string;
    }
  >;
}

export const SnapshotError: React.FunctionComponent<SnapshotErrorType> = ({ errors }) => {
  return (
    <>
      <EuiCallOut
        title={
          <FormattedMessage
            id="xpack.snapshotRestore.repositoryWarningTitle"
            defaultMessage="There were a few errors retrieving snapshots"
          />
        }
        color="warning"
        iconType="alert"
        data-test-subj="snapshotsErrorWarning"
      >
        <ul>
          {Object.keys(errors).map((errorKey) => (
            <li key={errorKey}>
              {sanitizeErrorType(errors[errorKey].type)}: {errors[errorKey].reason}
            </li>
          ))}
        </ul>
      </EuiCallOut>
      <EuiSpacer />
    </>
  );
};
