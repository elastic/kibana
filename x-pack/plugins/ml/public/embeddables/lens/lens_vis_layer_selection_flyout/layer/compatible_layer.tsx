/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import type * as estypes from '@elastic/elasticsearch/lib/api/typesWithBodyKey';
import React, { FC, useState, useCallback, useMemo } from 'react';
import { FormattedMessage } from '@kbn/i18n-react';
import useDebounce from 'react-use/lib/useDebounce';
import type { Embeddable } from '@kbn/lens-plugin/public';

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

import {
  redirectToADJobWizards,
  QuickJobCreator,
} from '../../../../application/jobs/new_job/job_from_lens';
import type { LayerResult } from '../../../../application/jobs/new_job/job_from_lens';
import { JOB_TYPE, DEFAULT_BUCKET_SPAN } from '../../../../../common/constants/new_job';
import { extractErrorMessage } from '../../../../../common/util/errors';
import { basicJobValidation } from '../../../../../common/util/job_utils';
import { JOB_ID_MAX_LENGTH } from '../../../../../common/constants/validation';
import { invalidTimeIntervalMessage } from '../../../../application/jobs/new_job/common/job_validator/util';
import { ML_APP_LOCATOR, ML_PAGES } from '../../../../../common/constants/locator';
import { useMlFromLensKibanaContext } from '../../context';

interface Props {
  layer: LayerResult;
  layerIndex: number;
  embeddable: Embeddable;
}

enum STATE {
  DEFAULT,
  VALIDATING,
  SAVING,
  SAVE_SUCCESS,
  SAVE_FAILED,
}

export const CompatibleLayer: FC<Props> = ({ layer, layerIndex, embeddable }) => {
  const {
    services: {
      data,
      share,
      application,
      uiSettings,
      mlServices: { mlApiServices },
    },
  } = useMlFromLensKibanaContext();

  const [jobId, setJobId] = useState<string | undefined>(undefined);
  const [startJob, setStartJob] = useState(true);
  const [runInRealTime, setRunInRealTime] = useState(true);
  const [bucketSpan, setBucketSpan] = useState(DEFAULT_BUCKET_SPAN);

  const [jobIdValidationError, setJobIdValidationError] = useState<string>('');
  const [bucketSpanValidationError, setBucketSpanValidationError] = useState<string>('');
  const [state, setState] = useState<STATE>(STATE.DEFAULT);
  const [createError, setCreateError] = useState<{ text: string; errorText: string } | null>(null);
  const quickJobCreator = useMemo(
    () =>
      new QuickJobCreator(
        data.dataViews,
        uiSettings,
        data.query.timefilter.timefilter,
        mlApiServices
      ),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [data, uiSettings]
  );

  function createADJobInWizard() {
    redirectToADJobWizards(embeddable, layerIndex, share);
  }

  async function createADJob() {
    if (jobId === undefined) {
      return;
    }

    setState(STATE.SAVING);
    setCreateError(null);
    const result = await quickJobCreator.createAndSaveJob(
      jobId,
      bucketSpan,
      embeddable,
      startJob,
      runInRealTime,
      layerIndex
    );
    const error = checkForCreationErrors(result);
    if (error === null) {
      setState(STATE.SAVE_SUCCESS);
    } else {
      setState(STATE.SAVE_FAILED);
      setCreateError(error);
    }
  }

  const viewResults = useCallback(
    async (jobType: JOB_TYPE | null) => {
      const { timeRange } = embeddable.getInput();
      const locator = share.url.locators.get(ML_APP_LOCATOR);
      if (locator) {
        const page = startJob
          ? jobType === JOB_TYPE.MULTI_METRIC
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
    [jobId, embeddable, share, application, startJob]
  );

  function setStartJobWrapper(start: boolean) {
    setStartJob(start);
    setRunInRealTime(start && runInRealTime);
  }

  useDebounce(
    function validateJobId() {
      if (jobId === undefined) {
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
      {state !== STATE.SAVE_SUCCESS && state !== STATE.SAVING ? (
        <>
          <EuiFlexGroup gutterSize="s" data-test-subj="mlLensLayerCompatible">
            <EuiFlexItem grow={false}>
              <EuiText size="s">
                <EuiIcon type="checkInCircleFilled" color="success" />
              </EuiText>
            </EuiFlexItem>
            <EuiFlexItem>
              <EuiText size="s">
                {layer.jobType === JOB_TYPE.MULTI_METRIC ? (
                  <FormattedMessage
                    id="xpack.ml.embeddables.lensLayerFlyout.createJobCalloutTitle.multiMetric"
                    defaultMessage="This layer can be used to create a multi-metric job"
                  />
                ) : (
                  <FormattedMessage
                    id="xpack.ml.embeddables.lensLayerFlyout.createJobCalloutTitle.singleMetric"
                    defaultMessage="This layer can be used to create a single metric job"
                  />
                )}
              </EuiText>
            </EuiFlexItem>
          </EuiFlexGroup>
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
                  bucketSpanValidationError !== ''
                }
                onClick={createADJob.bind(null, layerIndex)}
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
                  id="xpack.ml.embeddables.lensLayerFlyout.saveSuccess"
                  defaultMessage="Job created"
                />
              </EuiText>
            </EuiFlexItem>
          </EuiFlexGroup>

          <EuiSpacer size="s" />
          <EuiButtonEmpty
            onClick={viewResults.bind(null, layer.jobType)}
            flush="left"
            data-test-subj={`mlLensLayerResultsButton_${layerIndex}`}
          >
            {startJob === false ? (
              <FormattedMessage
                id="xpack.ml.embeddables.lensLayerFlyout.saveSuccess.resultsLink.jobList"
                defaultMessage="View in job management page"
              />
            ) : layer.jobType === JOB_TYPE.MULTI_METRIC ? (
              <FormattedMessage
                id="xpack.ml.embeddables.lensLayerFlyout.saveSuccess.resultsLink.multiMetric"
                defaultMessage="View results in Anomaly Explorer"
              />
            ) : (
              <FormattedMessage
                id="xpack.ml.embeddables.lensLayerFlyout.saveSuccess.resultsLink.singleMetric"
                defaultMessage="View results in Single Metric Viewer"
              />
            )}
          </EuiButtonEmpty>
        </>
      ) : null}

      {state === STATE.SAVING ? (
        <EuiFlexGroup>
          <EuiFlexItem grow={false}>
            <FormattedMessage
              id="xpack.ml.embeddables.lensLayerFlyout.creatingJob"
              defaultMessage="Creating job"
            />
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiLoadingSpinner />
          </EuiFlexItem>
        </EuiFlexGroup>
      ) : null}

      {state === STATE.SAVE_FAILED && createError !== null ? (
        <>
          <EuiSpacer />
          <EuiCallOut color="danger" title={createError.text}>
            {createError.errorText}
          </EuiCallOut>
        </>
      ) : null}
    </>
  );
};

const checkForCreationErrors = (
  result: Awaited<ReturnType<QuickJobCreator['createAndSaveJob']>>
) => {
  if (result.jobCreated.error) {
    return {
      text: i18n.translate('xpack.ml.embeddables.lensLayerFlyout.jobCreateError.jobCreated', {
        defaultMessage: 'Job could not be created.',
      }),
      errorText: extractErrorMessage(result.jobCreated.error),
    };
  } else if (result.datafeedCreated.error) {
    return {
      text: i18n.translate('xpack.ml.embeddables.lensLayerFlyout.jobCreateError.datafeedCreated', {
        defaultMessage: 'Job created but datafeed could not be created.',
      }),
      errorText: extractErrorMessage(result.datafeedCreated.error),
    };
  } else if (result.jobOpened.error) {
    return {
      text: i18n.translate('xpack.ml.embeddables.lensLayerFlyout.jobCreateError.jobOpened', {
        defaultMessage: 'Job and datafeed created but the job could not be opened.',
      }),
      errorText: extractErrorMessage(result.jobOpened.error),
    };
  } else if (result.datafeedStarted.error) {
    return {
      text: i18n.translate('xpack.ml.embeddables.lensLayerFlyout.jobCreateError.datafeedStarted', {
        defaultMessage: 'Job and datafeed created but the datafeed could not be started.',
      }),
      errorText: extractErrorMessage(result.datafeedStarted.error),
    };
  } else {
    return null;
  }
};
