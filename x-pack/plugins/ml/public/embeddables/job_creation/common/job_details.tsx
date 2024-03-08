/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FC } from 'react';
import React, { useState, useCallback } from 'react';
import useDebounce from 'react-use/lib/useDebounce';

import type * as estypes from '@elastic/elasticsearch/lib/api/typesWithBodyKey';
import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiButton,
  EuiSpacer,
  EuiIcon,
  EuiText,
  EuiFieldText,
  EuiForm,
  EuiFormRow,
  EuiLoadingSpinner,
  EuiButtonEmpty,
  EuiCheckbox,
  EuiAccordion,
  EuiCallOut,
} from '@elastic/eui';

import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import { extractErrorMessage } from '@kbn/ml-error-utils';
import type { TimeRange } from '@kbn/es-query';
import type { QuickLensJobCreator } from '../../../application/jobs/new_job/job_from_lens';
import type { LayerResult } from '../../../application/jobs/new_job/job_from_lens';
import type { CreateState } from '../../../application/jobs/new_job/job_from_dashboard';
import { JOB_TYPE, DEFAULT_BUCKET_SPAN } from '../../../../common/constants/new_job';
import { basicJobValidation } from '../../../../common/util/job_utils';
import { JOB_ID_MAX_LENGTH } from '../../../../common/constants/validation';
import { invalidTimeIntervalMessage } from '../../../application/jobs/new_job/common/job_validator/util';
import { ML_APP_LOCATOR, ML_PAGES } from '../../../../common/constants/locator';
import { useMlFromLensKibanaContext } from './context';

export interface CreateADJobParams {
  jobId: string;
  bucketSpan: string;
  startJob: boolean;
  runInRealTime: boolean;
}

interface Props {
  children?: React.ReactElement;
  createADJobInWizard: () => void;
  createADJob: (args: CreateADJobParams) => Promise<CreateState>;
  layer?: LayerResult;
  layerIndex: number;
  timeRange: TimeRange | undefined;
  incomingCreateError?: { text: string; errorText: string };
  outerFormComplete?: boolean;
}

enum STATE {
  DEFAULT,
  VALIDATING,
  SAVING,
  SAVE_SUCCESS,
  SAVE_FAILED,
}

export const JobDetails: FC<Props> = ({
  children,
  createADJobInWizard,
  createADJob,
  layer,
  layerIndex,
  timeRange,
  incomingCreateError,
  outerFormComplete,
}) => {
  const {
    services: {
      share,
      application,
      mlServices: { mlApiServices },
    },
  } = useMlFromLensKibanaContext();

  const [jobId, setJobId] = useState<string>('');
  const [startJob, setStartJob] = useState(true);
  const [runInRealTime, setRunInRealTime] = useState(true);
  const [bucketSpan, setBucketSpan] = useState(DEFAULT_BUCKET_SPAN);

  const [jobIdValidationError, setJobIdValidationError] = useState<string>('');
  const [bucketSpanValidationError, setBucketSpanValidationError] = useState<string>('');
  const [state, setState] = useState<STATE>(STATE.DEFAULT);
  const [createError, setCreateError] = useState<{ text: string; errorText: string } | null>(null);

  const jobType = layer?.jobType ?? JOB_TYPE.GEO;

  async function createJob() {
    if (jobId === undefined || jobId === '') {
      return;
    }
    setState(STATE.SAVING);
    setCreateError(null);
    const result = await createADJob({
      jobId,
      bucketSpan,
      startJob,
      runInRealTime,
    });
    const error = checkForCreationErrors(result);
    if (error === null) {
      setState(STATE.SAVE_SUCCESS);
    } else {
      setState(STATE.SAVE_FAILED);
      setCreateError(error);
    }
  }

  const viewResults = useCallback(
    async (type: JOB_TYPE | null) => {
      const locator = share.url.locators.get(ML_APP_LOCATOR);
      if (locator) {
        const page = startJob
          ? type === JOB_TYPE.MULTI_METRIC || type === JOB_TYPE.GEO
            ? ML_PAGES.ANOMALY_EXPLORER
            : ML_PAGES.SINGLE_METRIC_VIEWER
          : ML_PAGES.ANOMALY_DETECTION_JOBS_MANAGE;
        const pageState = startJob
          ? {
              jobIds: [jobId],
              timeRange,
            }
          : { jobId };

        const url = await locator!.getUrl({
          page,
          pageState,
        });

        application.navigateToUrl(url);
      }
    },
    [share, startJob, jobId, timeRange, application]
  );

  function setStartJobWrapper(start: boolean) {
    setStartJob(start);
    setRunInRealTime(start && runInRealTime);
  }

  useDebounce(
    function validateJobId() {
      if (jobId === undefined || jobId === '') {
        return;
      }
      setJobIdValidationError('');
      setBucketSpanValidationError('');
      const validationResults = basicJobValidation(
        {
          job_id: jobId,
          analysis_config: { detectors: [], bucket_span: bucketSpan },
        } as unknown as estypes.MlJob,
        undefined,
        { max_model_memory_limit: '', effective_max_model_memory_limit: '' },
        true
      );

      if (validationResults.contains('job_id_invalid')) {
        setJobIdValidationError(
          i18n.translate('xpack.ml.newJob.wizard.validateJob.jobNameAllowedCharactersDescription', {
            defaultMessage:
              'Job ID can contain lowercase alphanumeric (a-z and 0-9), hyphens or underscores; ' +
              'must start and end with an alphanumeric character',
          })
        );
      } else if (validationResults.contains('job_id_invalid_max_length')) {
        setJobIdValidationError(
          i18n.translate('xpack.ml.newJob.wizard.validateJob.jobIdInvalidMaxLengthErrorMessage', {
            defaultMessage:
              'Job ID must be no more than {maxLength, plural, one {# character} other {# characters}} long.',
            values: {
              maxLength: JOB_ID_MAX_LENGTH,
            },
          })
        );
      } else {
        mlApiServices.jobs
          .jobsExist([jobId])
          .then((resp) => {
            if (resp[jobId].exists) {
              setJobIdValidationError(
                i18n.translate('xpack.ml.newJob.wizard.validateJob.jobNameAlreadyExists', {
                  defaultMessage:
                    'Job ID already exists. A job ID cannot be the same as an existing job or group.',
                })
              );
            }
          })
          .catch((error) => {
            // eslint-disable-next-line no-console
            console.error('Could not validate whether job ID exists');
          });
      }

      if (validationResults.contains('bucket_span_invalid')) {
        setBucketSpanValidationError(invalidTimeIntervalMessage(bucketSpan));
      }
      setState(STATE.DEFAULT);
    },
    500,
    [jobId, bucketSpan]
  );

  return (
    <>
      {(state !== STATE.SAVE_SUCCESS && state !== STATE.SAVING) || incomingCreateError ? (
        <>
          {children ?? null}
          <EuiSpacer size="m" />
          <EuiForm>
            <EuiFormRow
              label={i18n.translate('xpack.ml.newJob.wizard.jobDetailsStep.jobId.title', {
                defaultMessage: 'Job ID',
              })}
              error={jobIdValidationError}
              isInvalid={jobIdValidationError !== ''}
            >
              <EuiFieldText
                data-test-subj={`mlLensLayerJobIdInput_${layerIndex}`}
                value={jobId}
                onChange={(e) => {
                  setJobId(e.target.value);
                  setState(STATE.VALIDATING);
                }}
              />
            </EuiFormRow>

            <EuiSpacer size="s" />
            <EuiAccordion
              data-test-subj={`mlLensLayerAdditionalSettingsButton_${layerIndex}`}
              id="additional-section"
              buttonContent={i18n.translate(
                'xpack.ml.embeddables.lensLayerFlyout.createJobCallout.additionalSettings.title',
                {
                  defaultMessage: 'Additional settings',
                }
              )}
            >
              <EuiSpacer size="s" />
              <EuiFormRow
                label={i18n.translate(
                  'xpack.ml.newJob.wizard.pickFieldsStep.bucketSpan.placeholder',
                  {
                    defaultMessage: 'Bucket span',
                  }
                )}
                error={bucketSpanValidationError}
                isInvalid={bucketSpanValidationError !== ''}
              >
                <EuiFieldText
                  data-test-subj={`mlLensLayerBucketSpanInput_${layerIndex}`}
                  value={bucketSpan}
                  onChange={(e) => {
                    setBucketSpan(e.target.value);
                    setState(STATE.VALIDATING);
                  }}
                />
              </EuiFormRow>
              <EuiSpacer size="l" />
              <EuiFormRow>
                <EuiCheckbox
                  id="startJob"
                  data-test-subj={`mlLensLayerStartJobCheckbox_${layerIndex}`}
                  checked={startJob}
                  onChange={(e) => setStartJobWrapper(e.target.checked)}
                  label={i18n.translate(
                    'xpack.ml.embeddables.lensLayerFlyout.createJobCallout.additionalSettings.start',
                    {
                      defaultMessage: 'Start the job after saving',
                    }
                  )}
                />
              </EuiFormRow>

              <EuiSpacer size="s" />
              <EuiFormRow>
                <EuiCheckbox
                  id="realTime"
                  disabled={startJob === false}
                  data-test-subj={`mlLensLayerRealTimeCheckbox_${layerIndex}`}
                  checked={runInRealTime}
                  onChange={(e) => setRunInRealTime(e.target.checked)}
                  label={i18n.translate(
                    'xpack.ml.embeddables.lensLayerFlyout.createJobCallout.additionalSettings.realTime',
                    {
                      defaultMessage: 'Leave the job running for new data',
                    }
                  )}
                />
              </EuiFormRow>
              <EuiSpacer size="m" />
            </EuiAccordion>
          </EuiForm>
          <EuiSpacer size="m" />
          <EuiFlexGroup>
            <EuiFlexItem>
              <EuiButton
                disabled={
                  state === STATE.VALIDATING ||
                  jobId === '' ||
                  jobIdValidationError !== '' ||
                  bucketSpanValidationError !== '' ||
                  outerFormComplete === false
                }
                onClick={createJob.bind(null, layerIndex)}
                size="s"
                data-test-subj={`mlLensLayerCreateJobButton_${layerIndex}`}
              >
                <FormattedMessage
                  id="xpack.ml.embeddables.lensLayerFlyout.createJobButton.saving"
                  defaultMessage="Create job"
                />
              </EuiButton>
            </EuiFlexItem>

            <EuiFlexItem grow={false}>
              <EuiButtonEmpty
                onClick={createADJobInWizard.bind(null, layerIndex)}
                size="s"
                iconType="popout"
                iconSide="right"
                data-test-subj={`mlLensLayerCreateWithWizardButton_${layerIndex}`}
              >
                <FormattedMessage
                  id="xpack.ml.embeddables.lensLayerFlyout.createJobButton"
                  defaultMessage="Create job using wizard"
                />
              </EuiButtonEmpty>
            </EuiFlexItem>
          </EuiFlexGroup>
        </>
      ) : null}

      {state === STATE.SAVE_SUCCESS ? (
        <>
          <EuiFlexGroup
            gutterSize="s"
            data-test-subj={`mlLensLayerCompatible.jobCreated.success_${layerIndex}`}
          >
            <EuiFlexItem grow={false}>
              <EuiText size="s">
                <EuiIcon type="checkInCircleFilled" color="success" />
              </EuiText>
            </EuiFlexItem>
            <EuiFlexItem>
              <EuiText size="s">
                <FormattedMessage
                  id="xpack.ml.embeddables.flyout.flyoutAdditionalSettings.saveSuccess"
                  defaultMessage="Job created"
                />
              </EuiText>
            </EuiFlexItem>
          </EuiFlexGroup>

          <EuiSpacer size="s" />
          <EuiButtonEmpty
            onClick={viewResults.bind(null, jobType)}
            flush="left"
            data-test-subj={`mlLensLayerResultsButton_${layerIndex}`}
          >
            {startJob === false ? (
              <FormattedMessage
                id="xpack.ml.embeddables.flyoutAdditionalSettings.saveSuccess.resultsLink.jobList"
                defaultMessage="View in job management page"
              />
            ) : jobType === JOB_TYPE.MULTI_METRIC || jobType === JOB_TYPE.GEO ? (
              <FormattedMessage
                id="xpack.ml.embeddables.flyoutAdditionalSettings.saveSuccess.resultsLink.multiMetric"
                defaultMessage="View results in Anomaly Explorer"
              />
            ) : (
              <FormattedMessage
                id="xpack.ml.embeddables.flyoutAdditionalSettings.saveSuccess.resultsLink.singleMetric"
                defaultMessage="View results in Single Metric Viewer"
              />
            )}
          </EuiButtonEmpty>
        </>
      ) : null}

      {state === STATE.SAVING && incomingCreateError === undefined ? (
        <>
          <EuiFlexGroup>
            <EuiFlexItem grow={false}>
              <FormattedMessage
                id="xpack.ml.embeddables.flyoutAdditionalSettings.creatingJob"
                defaultMessage="Creating job"
              />
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <EuiLoadingSpinner />
            </EuiFlexItem>
          </EuiFlexGroup>
        </>
      ) : null}

      {state === STATE.SAVE_FAILED && createError !== null ? (
        <>
          <EuiSpacer />
          <EuiCallOut color="danger" title={createError.text}>
            {createError.errorText}
          </EuiCallOut>
        </>
      ) : null}
      {incomingCreateError ? (
        <>
          <EuiSpacer />
          <EuiCallOut color="danger" title={incomingCreateError.text}>
            {incomingCreateError.errorText}
          </EuiCallOut>
        </>
      ) : null}
    </>
  );
};

const checkForCreationErrors = (
  result: Awaited<ReturnType<QuickLensJobCreator['createAndSaveJob']>>
) => {
  if (result.jobCreated.error) {
    return {
      text: i18n.translate(
        'xpack.ml.embeddables.flyoutAdditionalSettings.jobCreateError.jobCreated',
        {
          defaultMessage: 'Job could not be created.',
        }
      ),
      errorText: extractErrorMessage(result.jobCreated.error),
    };
  } else if (result.datafeedCreated.error) {
    return {
      text: i18n.translate(
        'xpack.ml.embeddables.flyoutAdditionalSettings.jobCreateError.datafeedCreated',
        {
          defaultMessage: 'Job created but datafeed could not be created.',
        }
      ),
      errorText: extractErrorMessage(result.datafeedCreated.error),
    };
  } else if (result.jobOpened.error) {
    return {
      text: i18n.translate(
        'xpack.ml.embeddables.flyoutAdditionalSettings.jobCreateError.jobOpened',
        {
          defaultMessage: 'Job and datafeed created but the job could not be opened.',
        }
      ),
      errorText: extractErrorMessage(result.jobOpened.error),
    };
  } else if (result.datafeedStarted.error) {
    return {
      text: i18n.translate(
        'xpack.ml.embeddables.flyoutAdditionalSettings.jobCreateError.datafeedStarted',
        {
          defaultMessage: 'Job and datafeed created but the datafeed could not be started.',
        }
      ),
      errorText: extractErrorMessage(result.datafeedStarted.error),
    };
  } else {
    return null;
  }
};
