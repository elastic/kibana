/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { Fragment, FC } from 'react';
import { EuiDescribedFormGroup, EuiFormRow, EuiTextArea } from '@elastic/eui';

interface Props {
  jobDescription: string;
  setJobDescription: (id: string) => void;
}

export const JobDescriptionInput: FC<Props> = ({ jobDescription, setJobDescription }) => {
  return (
    <EuiDescribedFormGroup
      idAria="single-example-aria"
      title={<h3>Job description</h3>}
      description={
        <Fragment>
          Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt
          ut labore et dolore magna aliqua. Ut enim ad minim veniam.
        </Fragment>
      }
    >
      <EuiFormRow label="Job description" describedByIds={['single-example-aria']}>
        <EuiTextArea
          placeholder="Job description"
          value={jobDescription}
          onChange={e => setJobDescription(e.target.value)}
        />
      </EuiFormRow>
    </EuiDescribedFormGroup>
  );
};
