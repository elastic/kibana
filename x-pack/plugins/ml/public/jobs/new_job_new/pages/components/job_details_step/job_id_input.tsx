/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { Fragment, FC } from 'react';
import { EuiDescribedFormGroup, EuiFormRow, EuiFieldText } from '@elastic/eui';

interface Props {
  jobId: string;
  setJobId: (id: string) => void;
}

export const JobIdInput: FC<Props> = ({ jobId, setJobId }) => {
  return (
    <EuiDescribedFormGroup
      idAria="single-example-aria"
      title={<h3>Job Id</h3>}
      description={
        <Fragment>
          Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt
          ut labore et dolore magna aliqua. Ut enim ad minim veniam.
        </Fragment>
      }
    >
      <EuiFormRow label="Job Id" describedByIds={['single-example-aria']}>
        <EuiFieldText placeholder="Job Id" value={jobId} onChange={e => setJobId(e.target.value)} />
      </EuiFormRow>
    </EuiDescribedFormGroup>
  );
};
