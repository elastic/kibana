/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import type * as estypes from '@elastic/elasticsearch/lib/api/typesWithBodyKey';
import React, { FC, useState, useCallback } from 'react';
import { FormattedMessage } from '@kbn/i18n-react';
import useDebounce from 'react-use/lib/useDebounce';
import type { Embeddable } from '@kbn/lens-plugin/public';
import type { SharePluginStart } from '@kbn/share-plugin/public';
import type { DataPublicPluginStart } from '@kbn/data-plugin/public';
import type { IUiSettingsClient, ApplicationStart } from '@kbn/core/public';

import './style.scss';
import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiButton,
  EuiSpacer,
  EuiIcon,
  EuiText,
  EuiSplitPanel,
  EuiHorizontalRule,
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
  convertLensToADJob,
  createAndSaveJob,
} from '../../../application/jobs/new_job/job_from_lens';
import type { LayerResult } from '../../../application/jobs/new_job/job_from_lens';
import { CREATED_BY_LABEL, DEFAULT_BUCKET_SPAN } from '../../../../common/constants/new_job';
import { extractErrorMessage } from '../../../../common/util/errors';
import { MlApiServices } from '../../../application/services/ml_api_service';
import { basicJobValidation } from '../../../../common/util/job_utils';
import { JOB_ID_MAX_LENGTH } from '../../../../common/constants/validation';
import { invalidTimeIntervalMessage } from '../../../application/jobs/new_job/common/job_validator/util';
import { ML_APP_LOCATOR } from '../../../../common/constants/locator';

interface Props {
  layerResults: LayerResult[];
  embeddable: Embeddable;
  share: SharePluginStart;
  data: DataPublicPluginStart;
  application: ApplicationStart;
  kibanaConfig: IUiSettingsClient;
  ml: MlApiServices;
  onClose: () => void;
}

enum STATE {
  DEFAULT,
  VALIDATING,
  SAVING,
  SAVE_SUCCESS,
  SAVE_FAILED,
}

export const FlyoutBody: FC<Props> = ({
  onClose,
  layerResults,
  embeddable,
  share,
  data,
  application,
  ml,
  kibanaConfig,
}) => {
  const [jobId, setJobId] = useState('');
  const [startJob, setStartJob] = useState(true);
  const [runInRealTime, setRunInRealTime] = useState(true);
  const [bucketSpan, setBucketSpan] = useState(DEFAULT_BUCKET_SPAN);

  const [jobIdValid, setJobIdValid] = useState<string>('');
  const [bucketSpanValid, setBucketSpanValid] = useState<string>('');
  const [state, setState] = useState<STATE>(STATE.DEFAULT);
  const [createError, setCreateError] = useState<{ text: string; errorText: string } | null>(null);

  function createADJobInWizard(layerIndex: number) {
    convertLensToADJob(embeddable, share, layerIndex);
  }

  async function createADJob(layerIndex: number) {
    setState(STATE.SAVING);
    setCreateError(null);
    const result = await createAndSaveJob(
      jobId,
      bucketSpan,
      embeddable,
      startJob,
      runInRealTime,
      data.dataViews,
      kibanaConfig,
      data.query.timefilter.timefilter,
      ml,
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
    async (jobType: CREATED_BY_LABEL | null) => {
      const { timeRange } = embeddable.getInput();
      const page = jobType === CREATED_BY_LABEL.MULTI_METRIC ? 'explorer' : 'timeseriesexplorer';
      const locator = share.url.locators.get(ML_APP_LOCATOR);
      if (locator) {
        const url = await locator!.getUrl({
          page,
          pageState: {
            jobIds: [jobId],
            timeRange,
          },
        });

        application.navigateToUrl(url);
      }
    },
    [embeddable, share, application]
  );

  function setStartJobWrapper(start: boolean) {
    setStartJob(start);
    setRunInRealTime(start && runInRealTime);
  }

  useDebounce(
    async function validateJobId() {
      setJobIdValid('');
      setBucketSpanValid('');
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
        setJobIdValid(
          i18n.translate('xpack.ml.newJob.wizard.validateJob.jobNameAllowedCharactersDescription', {
            defaultMessage:
              'Job ID can contain lowercase alphanumeric (a-z and 0-9), hyphens or underscores; ' +
              'must start and end with an alphanumeric character',
          })
        );
      } else if (validationResults.contains('job_id_invalid_max_length')) {
        setJobIdValid(
          i18n.translate('xpack.ml.newJob.wizard.validateJob.jobIdInvalidMaxLengthErrorMessage', {
            defaultMessage:
              'Job ID must be no more than {maxLength, plural, one {# character} other {# characters}} long.',
            values: {
              maxLength: JOB_ID_MAX_LENGTH,
            },
          })
        );
      } else {
        const resp = await ml.jobs.jobsExist([jobId]);
        if (resp[jobId].exists) {
          setJobIdValid(
            i18n.translate('xpack.ml.newJob.wizard.validateJob.jobNameAlreadyExists', {
              defaultMessage:
                'Job ID already exists. A job ID cannot be the same as an existing job or group.',
            })
          );
        }
      }

      if (validationResults.contains('bucket_span_invalid')) {
        setBucketSpanValid(invalidTimeIntervalMessage(bucketSpan));
      }
      setState(STATE.DEFAULT);
    },
    500,
    [jobId, bucketSpan]
  );

  return (
    <>
      {layerResults.map((layer, i) => (
        <React.Fragment key={layer.id}>
          <EuiSplitPanel.Outer grow>
            <EuiSplitPanel.Inner>
              <EuiFlexGroup gutterSize="s" alignItems="center" responsive={false}>
                {layer.icon && (
                  <EuiFlexItem grow={false}>
                    <EuiIcon type={layer.icon} />
                  </EuiFlexItem>
                )}
                <EuiFlexItem grow>
                  <EuiText color={layer.isCompatible ? '' : 'subdued'}>
                    <h5>{layer.label}</h5>
                  </EuiText>
                </EuiFlexItem>
              </EuiFlexGroup>
            </EuiSplitPanel.Inner>
            <EuiHorizontalRule margin="none" />
            <EuiSplitPanel.Inner grow={false} color="subdued">
              {layer.isCompatible ? (
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
                            {layer.jobWizardType === CREATED_BY_LABEL.MULTI_METRIC ? (
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
                        <EuiFormRow label="Job ID" error={jobIdValid} isInvalid={jobIdValid !== ''}>
                          <EuiFieldText
                            data-test-subj={`mlLensLayerJobIdInput_${i}`}
                            value={jobId}
                            onChange={(e) => {
                              setJobId(e.target.value);
                              setState(STATE.VALIDATING);
                            }}
                          />
                        </EuiFormRow>

                        <EuiSpacer size="s" />
                        <EuiAccordion
                          data-test-subj={`mlLensLayerAdditionalSettingsButton_${i}`}
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
                            label="Bucket span"
                            error={bucketSpanValid}
                            isInvalid={bucketSpanValid !== ''}
                          >
                            <EuiFieldText
                              data-test-subj={`mlLensLayerBucketSpanInput_${i}`}
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
                              data-test-subj={`mlLensLayerStartJobCheckbox_${i}`}
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
                              data-test-subj={`mlLensLayerRealTimeCheckbox_${i}`}
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
                              jobIdValid !== '' ||
                              bucketSpanValid !== ''
                            }
                            onClick={createADJob.bind(null, i)}
                            size="s"
                            data-test-subj={`mlLensLayerCreateJobButton_${i}`}
                          >
                            <FormattedMessage
                              id="xpack.ml.embeddables.lensLayerFlyout.createJobButton.saving"
                              defaultMessage="Create job"
                            />
                          </EuiButton>
                        </EuiFlexItem>

                        <EuiFlexItem grow={false}>
                          <EuiButtonEmpty
                            onClick={createADJobInWizard.bind(null, i)}
                            size="s"
                            iconType="popout"
                            iconSide="right"
                            data-test-subj={`mlLensLayerCreateWithWizardButton_${i}`}
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
                        data-test-subj={`mlLensLayerCompatible.jobCreated.success_${i}`}
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
                        onClick={viewResults.bind(null, layer.jobWizardType)}
                        flush="left"
                        data-test-subj={`mlLensLayerResultsButton_${i}`}
                      >
                        {layer.jobWizardType === CREATED_BY_LABEL.MULTI_METRIC ? (
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
              ) : (
                <>
                  <EuiFlexGroup
                    gutterSize="s"
                    color="subdued"
                    data-test-subj="mlLensLayerIncompatible"
                  >
                    <EuiFlexItem grow={false}>
                      <EuiText size="s">
                        <EuiIcon type="crossInACircleFilled" color="subdued" />
                      </EuiText>
                    </EuiFlexItem>
                    <EuiFlexItem>
                      <EuiText color="subdued" size="s">
                        {layer.error ? (
                          extractErrorMessage(layer.error)
                        ) : (
                          <FormattedMessage
                            id="xpack.ml.embeddables.lensLayerFlyout.defaultLayerError"
                            defaultMessage="This layer cannot be used to create an anomaly detection job"
                          />
                        )}
                      </EuiText>
                    </EuiFlexItem>
                  </EuiFlexGroup>
                </>
              )}
            </EuiSplitPanel.Inner>
          </EuiSplitPanel.Outer>
          <EuiSpacer />
        </React.Fragment>
      ))}
    </>
  );
};

const checkForCreationErrors = (result: Awaited<ReturnType<typeof createAndSaveJob>>) => {
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
