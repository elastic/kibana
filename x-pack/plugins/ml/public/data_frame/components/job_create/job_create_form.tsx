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
  EuiFlexGrid,
  EuiFlexGroup,
  EuiFlexItem,
  EuiForm,
  EuiHorizontalRule,
  EuiIcon,
  EuiPanel,
  EuiProgress,
  EuiSpacer,
  EuiText,
} from '@elastic/eui';

import { ml } from '../../../services/ml_api_service';
import { PROGRESS_JOBS_REFRESH_INTERVAL_MS } from '../../../../common/constants/jobs_list';

import { moveToDataFrameJobsList, moveToDiscover } from '../../common';

import { KibanaContext, isKibanaContext } from '../../common';

export interface JobDetailsExposedState {
  created: boolean;
  started: boolean;
  indexPatternId: string | undefined;
}

export function getDefaultJobCreateState(): JobDetailsExposedState {
  return {
    created: false,
    started: false,
    indexPatternId: undefined,
  };
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
    const [indexPatternId, setIndexPatternId] = useState(defaults.indexPatternId);
    const [progressPercentComplete, setProgressPercentComplete] = useState<undefined | number>(
      undefined
    );

    const kibanaContext = useContext(KibanaContext);

    if (!isKibanaContext(kibanaContext)) {
      return null;
    }

    useEffect(
      () => {
        onChange({ created, started, indexPatternId });
      },
      [created, started, indexPatternId]
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

        setIndexPatternId(id);
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

    if (started === true && progressPercentComplete === undefined) {
      // wrapping in function so we can keep the interval id in local scope
      function startProgressBar() {
        const interval = setInterval(async () => {
          try {
            const stats = await ml.dataFrame.getDataFrameTransformsStats(jobId);
            const percent = Math.round(stats.transforms[0].state.progress.percent_complete);
            setProgressPercentComplete(percent);
            if (percent >= 100) {
              clearInterval(interval);
            }
          } catch (e) {
            toastNotifications.addDanger(
              i18n.translate('xpack.ml.dataframe.jobCreateForm.progressErrorMessage', {
                defaultMessage: 'An error occurred getting the progress percentage: {error}',
                values: { error: JSON.stringify(e) },
              })
            );
            clearInterval(interval);
          }
        }, PROGRESS_JOBS_REFRESH_INTERVAL_MS);
        setProgressPercentComplete(0);
      }

      startProgressBar();
    }

    function getJobConfigDevConsoleStatement() {
      return `PUT _data_frame/transforms/${jobId}\n${JSON.stringify(jobConfig, null, 2)}\n\n`;
    }

    // TODO move this to SASS
    const FLEX_GROUP_STYLE = { height: '90px', maxWidth: '800px' };
    const FLEX_ITEM_STYLE = { width: '200px' };
    const PANEL_ITEM_STYLE = { width: '300px' };

    return (
      <EuiForm>
        {!created && (
          <EuiFlexGroup alignItems="center" style={FLEX_GROUP_STYLE}>
            <EuiFlexItem grow={false} style={FLEX_ITEM_STYLE}>
              <EuiButton fill isDisabled={created && started} onClick={createAndStartDataFrame}>
                {i18n.translate('xpack.ml.dataframe.jobCreateForm.createAndStartDataFrameButton', {
                  defaultMessage: 'Create and start',
                })}
              </EuiButton>
            </EuiFlexItem>
            <EuiFlexItem>
              <EuiText color="subdued" size="s">
                {i18n.translate(
                  'xpack.ml.dataframe.jobCreateForm.createAndStartDataFrameDescription',
                  {
                    defaultMessage:
                      'Creates and starts the data frame job. A data frame job will increase search and indexing load in your cluster. Please stop the job if excessive load is experienced. After the job is started, you will be offered options to continue exploring the data frame job.',
                  }
                )}
              </EuiText>
            </EuiFlexItem>
          </EuiFlexGroup>
        )}
        {created && (
          <EuiFlexGroup alignItems="center" style={FLEX_GROUP_STYLE}>
            <EuiFlexItem grow={false} style={FLEX_ITEM_STYLE}>
              <EuiButton fill isDisabled={created && started} onClick={startDataFrame}>
                {i18n.translate('xpack.ml.dataframe.jobCreateForm.startDataFrameButton', {
                  defaultMessage: 'Start',
                })}
              </EuiButton>
            </EuiFlexItem>
            <EuiFlexItem>
              <EuiText color="subdued" size="s">
                {i18n.translate('xpack.ml.dataframe.jobCreateForm.startDataFrameDescription', {
                  defaultMessage:
                    'Starts the data frame job. A data frame job will increase search and indexing load in your cluster. Please stop the job if excessive load is experienced. After the job is started, you will be offered options to continue exploring the data frame job.',
                })}
              </EuiText>
            </EuiFlexItem>
          </EuiFlexGroup>
        )}
        <EuiFlexGroup alignItems="center" style={FLEX_GROUP_STYLE}>
          <EuiFlexItem grow={false} style={FLEX_ITEM_STYLE}>
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
        <EuiFlexGroup alignItems="center" style={FLEX_GROUP_STYLE}>
          <EuiFlexItem grow={false} style={FLEX_ITEM_STYLE}>
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
                    'Copies to the clipboard the Kibana Dev Console command for creating the job.',
                }
              )}
            </EuiText>
          </EuiFlexItem>
        </EuiFlexGroup>
        {progressPercentComplete !== undefined && (
          <Fragment>
            <EuiSpacer size="m" />
            <EuiText size="xs">
              <strong>
                {i18n.translate('xpack.ml.dataframe.jobCreateForm.progressTitle', {
                  defaultMessage: 'Progress',
                })}
              </strong>
            </EuiText>
            <EuiFlexGroup gutterSize="xs">
              <EuiFlexItem style={{ width: '400px' }} grow={false}>
                <EuiProgress size="l" color="primary" value={progressPercentComplete} max={100} />
              </EuiFlexItem>
              <EuiFlexItem>
                <EuiText size="xs">{progressPercentComplete}%</EuiText>
              </EuiFlexItem>
            </EuiFlexGroup>
          </Fragment>
        )}
        {created && (
          <Fragment>
            <EuiHorizontalRule />
            <EuiFlexGrid gutterSize="l">
              <EuiFlexItem style={PANEL_ITEM_STYLE}>
                <EuiCard
                  icon={<EuiIcon size="xxl" type="list" />}
                  title={i18n.translate('xpack.ml.dataframe.jobCreateForm.jobsListCardTitle', {
                    defaultMessage: 'Data frame jobs',
                  })}
                  description={i18n.translate(
                    'xpack.ml.dataframe.jobCreateForm.jobManagementCardDescription',
                    {
                      defaultMessage: 'Return to the data frame job management page.',
                    }
                  )}
                  onClick={moveToDataFrameJobsList}
                />
              </EuiFlexItem>
              {started === true && createIndexPattern === true && indexPatternId === undefined && (
                <EuiFlexItem style={PANEL_ITEM_STYLE}>
                  <EuiPanel style={{ position: 'relative' }}>
                    <EuiProgress size="xs" color="primary" position="absolute" />
                    <EuiText color="subdued" size="s">
                      <p>
                        {i18n.translate(
                          'xpack.ml.dataframe.jobCreateForm.creatingIndexPatternMessage',
                          {
                            defaultMessage: 'Creating Kibana index pattern ...',
                          }
                        )}
                      </p>
                    </EuiText>
                  </EuiPanel>
                </EuiFlexItem>
              )}
              {started === true && indexPatternId !== undefined && (
                <EuiFlexItem style={PANEL_ITEM_STYLE}>
                  <EuiCard
                    icon={<EuiIcon size="xxl" type="discoverApp" />}
                    title={i18n.translate('xpack.ml.dataframe.jobCreateForm.discoverCardTitle', {
                      defaultMessage: 'Discover',
                    })}
                    description={i18n.translate(
                      'xpack.ml.dataframe.jobCreateForm.discoverCardDescription',
                      {
                        defaultMessage: 'Use Discover to explore the data frame pivot.',
                      }
                    )}
                    onClick={() => moveToDiscover(indexPatternId, kibanaContext.kbnBaseUrl)}
                  />
                </EuiFlexItem>
              )}
            </EuiFlexGrid>
          </Fragment>
        )}
      </EuiForm>
    );
  }
);
