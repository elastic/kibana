/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { Fragment, SFC, useEffect, useState } from 'react';

import { i18n } from '@kbn/i18n';

import { EuiFieldText, EuiFormRow } from '@elastic/eui';

import { JobId, TargetIndex } from './common';

export interface JobDetailsExposedState {
  jobId: JobId;
  targetIndex: TargetIndex;
  touched: boolean;
  valid: boolean;
}

export function getDefaultJobDetailsState() {
  return {
    jobId: '',
    targetIndex: '',
    touched: false,
    valid: false,
  } as JobDetailsExposedState;
}

interface Props {
  overrides?: JobDetailsExposedState;
  onChange(s: JobDetailsExposedState): void;
}

export const JobDetailsForm: SFC<Props> = React.memo(({ overrides = {}, onChange }) => {
  const defaults = { ...getDefaultJobDetailsState(), ...overrides };

  const [jobId, setJobId] = useState(defaults.jobId);
  const [targetIndex, setTargetIndex] = useState(defaults.targetIndex);

  useEffect(
    () => {
      const valid = jobId !== '' && targetIndex !== '';
      onChange({ jobId, targetIndex, touched: true, valid });
    },
    [jobId, targetIndex]
  );

  return (
    <Fragment>
      <EuiFormRow
        label={i18n.translate('xpack.ml.dataframe.jobDetailsForm.jobIdLabel', {
          defaultMessage: 'Job id',
        })}
      >
        <EuiFieldText
          placeholder="job id"
          value={jobId}
          onChange={e => setJobId(e.target.value)}
          aria-label={i18n.translate('xpack.ml.dataframe.jobDetailsForm.jobIdInputAriaLabel', {
            defaultMessage: 'Choose a unique job id.',
          })}
        />
      </EuiFormRow>
      <EuiFormRow
        label={i18n.translate('xpack.ml.dataframe.jobDetailsForm.targetIndexLabel', {
          defaultMessage: 'Target index',
        })}
      >
        <EuiFieldText
          placeholder="target index"
          value={targetIndex}
          onChange={e => setTargetIndex(e.target.value)}
          aria-label={i18n.translate(
            'xpack.ml.dataframe.jobDetailsForm.targetIndexInputAriaLabel',
            {
              defaultMessage: 'Choose a non-existant target index name.',
            }
          )}
        />
      </EuiFormRow>
    </Fragment>
  );
});
