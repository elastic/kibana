/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { Fragment, SFC, useContext, useEffect, useState } from 'react';
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

import { KibanaContext, isKibanaContext } from '../../common';

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
  window.location.href = '#/data_frames';
}
interface Props {
  createIndexPattern: boolean;
  jobId: string;
  jobConfig: any;
  overrides: JobDetailsExposedState;
  onChange(s: JobDetailsExposedState): void;
}

export const JobCreateForm: SFC<Props> = React.memo(
  ({ createIndexPattern, jobConfig, jobId, onChange, overrides }) => {
    const defaults = { ...getDefaultJobCreateState(), ...overrides };

    const [created, setCreated] = useState(defaults.created);
    const [started, setStarted] = useState(defaults.started);

    const kibanaContext = useContext(KibanaContext);

    if (!isKibanaContext(kibanaContext)) {
      return null;
    }

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

      if (createIndexPattern) {
        createKibanaIndexPattern();
      }

      return true;
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

    const createKibanaIndexPattern = async () => {
      const indexPatternName = jobConfig.dest.index;

      try {
        const newIndexPattern = await kibanaContext.indexPatterns.get();

        Object.assign(newIndexPattern, {
          id: '',
          title: indexPatternName,
        });

        const id = await newIndexPattern.create();

        // check if there's a default index pattern, if not,
        // set the newly created one as the default index pattern.
        if (!kibanaContext.kibanaConfig.get('defaultIndex')) {
          await kibanaContext.kibanaConfig.set('defaultIndex', id);
        }

        toastNotifications.addSuccess(
          i18n.translate('xpack.ml.dataframe.jobCreateForm.reateIndexPatternSuccessMessage', {
            defaultMessage: 'Kibana index pattern {indexPatternName} created successfully.',
            values: { indexPatternName },
          })
        );
        return true;
      } catch (e) {
        toastNotifications.addDanger(
          i18n.translate('xpack.ml.dataframe.jobCreateForm.createIndexPatternErrorMessage', {
            defaultMessage:
              'An error occurred creating the Kibana index pattern {indexPatternName}: {error}',
            values: { indexPatternName, error: JSON.stringify(e) },
          })
        );
        return false;
      }
    };

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
  }
);
