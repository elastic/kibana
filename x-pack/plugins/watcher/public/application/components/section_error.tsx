/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiCallOut, EuiSpacer } from '@elastic/eui';
import React, { Fragment } from 'react';

export interface Error {
  error: string;

  /**
   * wrapEsError() on the server adds a "cause" array
   */
  cause?: string[];

  message?: string;

  /**
   * @deprecated
   */
  data: {
    error: string;
    cause?: string[];
    message?: string;
  };
}

interface Props {
  title: React.ReactNode;
  error: Error;
}

export const SectionError: React.FunctionComponent<Props> = ({ title, error, ...rest }) => {
  const data = error.data || error;

  const { error: errorString, cause, message } = data;

  return (
    <EuiCallOut title={title} color="danger" iconType="alert" {...rest}>
      <div data-test-subj="sectionErrorMessage">{message || errorString}</div>
      {cause && (
        <Fragment>
          <EuiSpacer size="m" />
          <ul>
            {cause.map((causeMsg, i) => (
              <li key={i}>{causeMsg}</li>
            ))}
          </ul>
        </Fragment>
      )}
    </EuiCallOut>
  );
};
