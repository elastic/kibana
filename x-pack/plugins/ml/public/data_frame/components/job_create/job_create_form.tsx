/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { Fragment, SFC, useEffect, useState } from 'react';
import { i18n } from '@kbn/i18n';
import { toastNotifications } from 'ui/notify';

import {
  EuiButton,
  // Module '"@elastic/eui"' has no exported member 'EuiCard'.
  // @ts-ignore
  EuiCard,
  EuiFlexGroup,
  EuiFlexItem,
  EuiIcon,
  EuiSpacer,
} from '@elastic/eui';

import { ml } from '../../../services/ml_api_service';

export interface JobDetailsExposedState {
  created: boolean;
  started: boolean;
}

export function getDefaultJobCreateState(): JobDetailsExposedState {
  return {
    created: false,
    started: false,
  };
}

function gotToDataFrameJobManagement() {
  window.location.href = '#/data_frame';
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

    try {
      await ml.dataFrame.createDataFrameTransformsJob(jobId, jobConfig);
      toastNotifications.addSuccess(
        i18n.translate('xpack.ml.dataframe.jobCreateForm.createJobSuccessMessage', {
          defaultMessage: 'Data frame job {jobId} created successfully.',
          values: { jobId },
        })
      );
      return true;
    } catch (e) {
      setCreated(false);
      toastNotifications.addDanger(
        i18n.translate('xpack.ml.dataframe.jobCreateForm.createJobErrorMessage', {
          defaultMessage: 'An error occurred creating the data frame job {jobId}: {error}',
          values: { jobId, error: JSON.stringify(e) },
        })
      );
      return false;
    }
  }

  async function startDataFrame() {
    setStarted(true);

    try {
      await ml.dataFrame.startDataFrameTransformsJob(jobId);
      toastNotifications.addSuccess(
        i18n.translate('xpack.ml.dataframe.jobCreateForm.startJobSuccessMessage', {
          defaultMessage: 'Data frame job {jobId} started successfully.',
          values: { jobId },
        })
      );
    } catch (e) {
      setStarted(false);
      toastNotifications.addDanger(
        i18n.translate('xpack.ml.dataframe.jobCreateForm.startJobErrorMessage', {
          defaultMessage: 'An error occurred starting the data frame job {jobId}: {error}',
          values: { jobId, error: JSON.stringify(e) },
        })
      );
    }
  }

  async function createAndStartDataFrame() {
    const success = await createDataFrame();
    if (success) {
      await startDataFrame();
    }
  }

  return (
    <Fragment>
      <EuiButton isDisabled={created} onClick={createDataFrame}>
        {i18n.translate('xpack.ml.dataframe.jobCreateForm.createDataFrameButton', {
          defaultMessage: 'Create data frame',
        })}
      </EuiButton>
      &nbsp;
      {!created && (
        <EuiButton fill isDisabled={created && started} onClick={createAndStartDataFrame}>
          {i18n.translate('xpack.ml.dataframe.jobCreateForm.createAndStartDataFrameButton', {
            defaultMessage: 'Create and start data frame',
          })}
        </EuiButton>
      )}
      {created && (
        <EuiButton isDisabled={created && started} onClick={startDataFrame}>
          {i18n.translate('xpack.ml.dataframe.jobCreateForm.startDataFrameButton', {
            defaultMessage: 'Start data frame',
          })}
        </EuiButton>
      )}
      {created && started && (
        <Fragment>
          <EuiSpacer size="m" />

          <EuiFlexGroup gutterSize="l">
            <EuiFlexItem>
              <EuiCard
                icon={<EuiIcon size="xxl" type="list" />}
                title={i18n.translate('xpack.ml.dataframe.jobCreateForm.jobManagementCardTitle', {
                  defaultMessage: 'Job management',
                })}
                description={i18n.translate(
                  'xpack.ml.dataframe.jobCreateForm.jobManagementCardDescription',
                  {
                    defaultMessage: 'Return to the data frame job management page.',
                  }
                )}
                onClick={gotToDataFrameJobManagement}
              />
            </EuiFlexItem>
          </EuiFlexGroup>
        </Fragment>
      )}
    </Fragment>
  );
});
