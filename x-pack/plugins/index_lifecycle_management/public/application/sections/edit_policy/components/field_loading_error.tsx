/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { FunctionComponent } from 'react';
import { EuiCallOut, EuiSpacer, EuiButtonIcon } from '@elastic/eui';

interface Props {
  title: React.ReactNode;
  body: React.ReactNode;
  resendRequest: () => void;
  'data-test-subj'?: string;
  'aria-label'?: string;
}

export const FieldLoadingError: FunctionComponent<Props> = (props) => {
  const { title, body, resendRequest } = props;
  return (
    <>
      <EuiSpacer size="m" />
      <EuiCallOut
        data-test-subj={props['data-test-subj']}
        iconType="help"
        color="warning"
        title={
          <>
            {title}

            <EuiButtonIcon
              size="s"
              color="warning"
              onClick={resendRequest}
              iconType="refresh"
              aria-label={props['aria-label']}
            />
          </>
        }
      >
        {body}
      </EuiCallOut>
    </>
  );
};
