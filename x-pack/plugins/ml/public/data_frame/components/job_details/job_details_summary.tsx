/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { Fragment, SFC } from 'react';

import { EuiFormRow } from '@elastic/eui';

import { JobId, TargetIndex } from './common';

interface Props {
  jobId: JobId;
  targetIndex: TargetIndex;
  touched: boolean;
}

export const JobDetailsSummary: SFC<Props> = React.memo(({ jobId, targetIndex, touched }) => {
  if (touched === false) {
    return null;
  }

  return (
    <Fragment>
      <EuiFormRow label="Job id">
        <span>{jobId}</span>
      </EuiFormRow>
      <EuiFormRow label="Target index">
        <span>{targetIndex}</span>
      </EuiFormRow>
    </Fragment>
  );
});
