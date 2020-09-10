/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { FunctionComponent } from 'react';
import { EuiCallOut, EuiSpacer } from '@elastic/eui';

interface Props {
  title: string;
  body: string;
}

export const DefaultAllocationWarning: FunctionComponent<Props> = ({ title, body }) => {
  return (
    <>
      <EuiSpacer size="s" />
      <EuiCallOut data-test-subj="defaultAllocationWarning" title={title} color="warning">
        {body}
      </EuiCallOut>
    </>
  );
};
