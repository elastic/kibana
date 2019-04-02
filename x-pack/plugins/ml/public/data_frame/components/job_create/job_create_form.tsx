/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { Fragment, SFC, useEffect, useState } from 'react';

import { EuiButton } from '@elastic/eui';

import { ml } from '../../../services/ml_api_service';

export interface JobDetailsExposedState {
  created: boolean;
  started: boolean;
}

export function getDefaultJobCreateState() {
  return {
    created: false,
    started: false,
  } as JobDetailsExposedState;
}

interface Props {
  jobId: string;
  jobConfig: any;
  overrides: JobDetailsExposedState;
  onChange(s: JobDetailsExposedState): void;
}

export const JobCreateForm: SFC<Props> = React.memo(({ jobConfig, jobId, onChange, overrides }) => {
  const defaults = { ...getDefaultJobCreateState(), ...overrides };

  const [created, setCreated] = useState(defaults.created);
  const [started, setStarted] = useState(defaults.started);

  useEffect(
    () => {
      onChange({ created, started });
    },
    [created, started]
  );

  async function createDataFrame() {
    setCreated(true);
    return await ml.dataFrame.createDataFrameTransformsJob(jobId, jobConfig);
  }

  async function startDataFrame() {
    setStarted(true);
    return await ml.dataFrame.startDataFrameTransformsJob(jobId);
  }

  async function createAndStartDataFrame() {
    await createDataFrame();
    await startDataFrame();
  }

  return (
    <Fragment>
      <EuiButton isDisabled={created} onClick={createDataFrame}>
        Create data frame
      </EuiButton>
      &nbsp;
      {!created && (
        <EuiButton isDisabled={created && started} onClick={createAndStartDataFrame}>
          Create and start data frame
        </EuiButton>
      )}
      {created && (
        <EuiButton isDisabled={created && started} onClick={startDataFrame}>
          Start data frame
        </EuiButton>
      )}
    </Fragment>
  );
});
