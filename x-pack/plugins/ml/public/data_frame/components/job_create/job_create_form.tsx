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
  EuiCopy,
  // Module '"@elastic/eui"' has no exported member 'EuiDescribedFormGroup'.
  // @ts-ignore
  EuiDescribedFormGroup,
  EuiFlexGroup,
  EuiFlexItem,
  EuiForm,
  EuiIcon,
  EuiSpacer,
  EuiText,
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

    function getJobConfigDevConsoleStatement() {
      return `PUT _data_frame/transforms/${jobId}\n${JSON.stringify(jobConfig, null, 2)}\n\n`;
    }

    return (
      <EuiForm>
        {!created && (
          <EuiFlexGroup alignItems="center" style={{ maxWidth: '800px' }}>
            <EuiFlexItem grow={false} style={{ width: '200px' }}>
              <EuiButton fill isDisabled={created && started} onClick={createAndStartDataFrame}>
                {i18n.translate('xpack.ml.dataframe.jobCreateForm.createAndStartDataFrameButton', {
                  defaultMessage: 'Create & start',
                })}
              </EuiButton>
            </EuiFlexItem>
            <EuiFlexItem>
              <EuiText color="subdued" size="s">
                {i18n.translate(
                  'xpack.ml.dataframe.jobCreateForm.createAndStartDataFrameDescription',
                  {
                    defaultMessage:
                      'Create and starts the data frame job. After the job is started, you will be offered options to continue exploring the data frame job.',
                  }
                )}
              </EuiText>
            </EuiFlexItem>
          </EuiFlexGroup>
        )}
        {created && (
          <EuiFlexGroup alignItems="center" style={{ maxWidth: '800px' }}>
            <EuiFlexItem grow={false} style={{ width: '200px' }}>
              <EuiButton isDisabled={created && started} onClick={startDataFrame}>
                {i18n.translate('xpack.ml.dataframe.jobCreateForm.startDataFrameButton', {
                  defaultMessage: 'Start',
                })}
              </EuiButton>
            </EuiFlexItem>
            <EuiFlexItem>
              <EuiText color="subdued" size="s">
                {i18n.translate('xpack.ml.dataframe.jobCreateForm.startDataFrameDescription', {
                  defaultMessage:
                    'Starts the data frame job. After the job is started, you will be offered options to continue exploring the data frame job.',
                })}
              </EuiText>
            </EuiFlexItem>
          </EuiFlexGroup>
        )}
        <EuiFlexGroup alignItems="center" style={{ maxWidth: '800px' }}>
          <EuiFlexItem grow={false} style={{ width: '200px' }}>
            <EuiButton isDisabled={created} onClick={createDataFrame}>
              {i18n.translate('xpack.ml.dataframe.jobCreateForm.createDataFrameButton', {
                defaultMessage: 'Create',
              })}
            </EuiButton>
          </EuiFlexItem>
          <EuiFlexItem>
            <EuiText color="subdued" size="s">
              {i18n.translate('xpack.ml.dataframe.jobCreateForm.createDataFrameDescription', {
                defaultMessage:
                  'Create the data frame job without starting it. You will be able to start the job later by returning to the data frame jobs list.',
              })}
            </EuiText>
          </EuiFlexItem>
        </EuiFlexGroup>
        <EuiFlexGroup alignItems="center" style={{ maxWidth: '800px' }}>
          <EuiFlexItem grow={false} style={{ width: '200px' }}>
            <EuiCopy textToCopy={getJobConfigDevConsoleStatement()}>
              {(copy: () => void) => (
                <EuiButton onClick={copy} style={{ width: '100%' }}>
                  {i18n.translate(
                    'xpack.ml.dataframe.jobCreateForm.copyJobConfigToClipBoardButton',
                    {
                      defaultMessage: 'Copy to clipboard',
                    }
                  )}
                </EuiButton>
              )}
            </EuiCopy>
          </EuiFlexItem>
          <EuiFlexItem>
            <EuiText color="subdued" size="s">
              {i18n.translate(
                'xpack.ml.dataframe.jobCreateForm.copyJobConfigToClipBoardDescription',
                {
                  defaultMessage:
                    'Copies a Kibana Dev Console statement to create the job to the clipboard.',
                }
              )}
            </EuiText>
          </EuiFlexItem>
        </EuiFlexGroup>
        {created && started && (
          <Fragment>
            <EuiSpacer size="m" />

            <EuiFlexGroup gutterSize="l">
              <EuiFlexItem grow={false}>
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
      </EuiForm>
    );
  }
);
