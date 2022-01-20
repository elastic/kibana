/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { Fragment, FC, useContext, useState, useEffect } from 'react';
import { Subscription } from 'rxjs';
import {
  EuiButton,
  EuiButtonEmpty,
  EuiHorizontalRule,
  EuiSpacer,
  EuiFlexGroup,
  EuiFlexItem,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import { useMlKibana, useNavigateToPath } from '../../../../../contexts/kibana';
import { PreviousButton } from '../wizard_nav';
import { WIZARD_STEPS, StepProps } from '../step_types';
import { JobCreatorContext } from '../job_creator_context';
import { JobRunner } from '../../../common/job_runner';
import { mlJobService } from '../../../../../services/job_service';
import { JsonEditorFlyout, EDITOR_MODE } from '../common/json_editor_flyout';
import { isSingleMetricJobCreator, isAdvancedJobCreator } from '../../../common/job_creator';
import { JobDetails } from './components/job_details';
import { DatafeedDetails } from './components/datafeed_details';
import { DetectorChart } from './components/detector_chart';
import { JobProgress } from './components/job_progress';
import { PostSaveOptions } from './components/post_save_options';
import { StartDatafeedSwitch } from './components/start_datafeed_switch';
import { NewJobAwaitingNodeWarning } from '../../../../../components/jobs_awaiting_node_warning';
import { toastNotificationServiceProvider } from '../../../../../services/toast_notification_service';
import {
  convertToAdvancedJob,
  resetJob,
  advancedStartDatafeed,
} from '../../../common/job_creator/util/general';
import { JobSectionTitle, DatafeedSectionTitle } from './components/common';

export const SummaryStep: FC<StepProps> = ({ setCurrentStep, isCurrentStep }) => {
  const {
    services: {
      notifications,
      http: { basePath },
    },
  } = useMlKibana();

  const navigateToPath = useNavigateToPath();

  const { jobCreator, jobValidator, jobValidatorUpdated, resultsLoader } =
    useContext(JobCreatorContext);
  const [progress, setProgress] = useState(resultsLoader.progress);
  const [creatingJob, setCreatingJob] = useState(false);
  const [isValid, setIsValid] = useState(jobValidator.validationSummary.basic);
  const [jobRunner, setJobRunner] = useState<JobRunner | null>(null);
  const [startDatafeed, setStartDatafeed] = useState(true);
  const [showJobAssignWarning, setShowJobAssignWarning] = useState(false);

  const isAdvanced = isAdvancedJobCreator(jobCreator);
  const jsonEditorMode = isAdvanced ? EDITOR_MODE.EDITABLE : EDITOR_MODE.READONLY;

  useEffect(() => {
    jobCreator.subscribeToProgress(setProgress);
  }, []);

  useEffect(() => {
    let s: Subscription | null = null;
    if (jobRunner !== null) {
      s = jobRunner.subscribeToJobAssignment((assigned: boolean) =>
        setShowJobAssignWarning(!assigned)
      );
    }
    return () => {
      if (s !== null) {
        s?.unsubscribe();
      }
    };
  }, [jobRunner]);

  async function start() {
    setCreatingJob(true);
    if (isAdvanced) {
      await createAdvancedJob();
    } else if (startDatafeed === true) {
      await createAndStartJob();
    } else {
      await createAdvancedJob(false);
    }
  }

  async function createAndStartJob() {
    try {
      const jr = await jobCreator.createAndStartJob();
      setJobRunner(jr);
    } catch (error) {
      handleJobCreationError(error);
    }
  }

  async function createAdvancedJob(showStartModal: boolean = true) {
    try {
      await jobCreator.createJob();
      await jobCreator.createDatafeed();
      advancedStartDatafeed(showStartModal ? jobCreator : null, navigateToPath);
    } catch (error) {
      handleJobCreationError(error);
    }
  }

  function handleJobCreationError(error: any) {
    const { displayErrorToast } = toastNotificationServiceProvider(notifications.toasts);
    displayErrorToast(
      error,
      i18n.translate('xpack.ml.newJob.wizard.summaryStep.createJobError', {
        defaultMessage: `Job creation error`,
      })
    );
    setCreatingJob(false);
  }

  function viewResults() {
    const url = mlJobService.createResultsUrl(
      [jobCreator.jobId],
      jobCreator.start,
      jobCreator.end,
      isSingleMetricJobCreator(jobCreator) === true ? 'timeseriesexplorer' : 'explorer'
    );
    navigateToPath(`${basePath.get()}/app/ml/${url}`);
  }

  function clickResetJob() {
    resetJob(jobCreator, navigateToPath);
  }

  const convertToAdvanced = () => {
    convertToAdvancedJob(jobCreator, navigateToPath);
  };

  useEffect(() => {
    setIsValid(jobValidator.validationSummary.basic);
  }, [jobValidatorUpdated]);

  return (
    <Fragment>
      {isCurrentStep && (
        <Fragment>
          {isAdvanced && <JobSectionTitle />}
          <DetectorChart />
          <EuiSpacer size="m" />
          <JobProgress progress={progress} />
          <EuiSpacer size="m" />
          <JobDetails />

          {isAdvanced === false && (
            <StartDatafeedSwitch
              startDatafeed={startDatafeed}
              setStartDatafeed={setStartDatafeed}
              disabled={creatingJob}
            />
          )}

          {isAdvanced && (
            <Fragment>
              <EuiHorizontalRule />
              <DatafeedSectionTitle />
              <EuiSpacer size="m" />
              <DatafeedDetails />
            </Fragment>
          )}

          <EuiHorizontalRule />
          {showJobAssignWarning && <NewJobAwaitingNodeWarning jobType="anomaly-detector" />}
          <EuiFlexGroup>
            {progress < 100 && (
              <Fragment>
                <EuiFlexItem grow={false}>
                  <PreviousButton
                    previous={() => setCurrentStep(WIZARD_STEPS.VALIDATION)}
                    previousActive={creatingJob === false && isValid === true}
                  />
                </EuiFlexItem>
                <EuiFlexItem grow={false}>
                  <EuiButton
                    onClick={start}
                    isDisabled={creatingJob === true || isValid === false}
                    data-test-subj="mlJobWizardButtonCreateJob"
                    fill
                  >
                    <FormattedMessage
                      id="xpack.ml.newJob.wizard.summaryStep.createJobButton"
                      defaultMessage="Create job"
                    />
                  </EuiButton>
                </EuiFlexItem>
              </Fragment>
            )}
            {creatingJob === false && (
              <Fragment>
                <EuiFlexItem grow={false}>
                  <JsonEditorFlyout
                    isDisabled={progress > 0}
                    jobEditorMode={jsonEditorMode}
                    datafeedEditorMode={jsonEditorMode}
                  />
                </EuiFlexItem>
                {isAdvanced === false && (
                  <EuiFlexItem grow={false}>
                    <EuiButtonEmpty onClick={convertToAdvanced}>
                      <FormattedMessage
                        id="xpack.ml.newJob.wizard.summaryStep.convertToAdvancedButton"
                        defaultMessage="Convert to advanced job"
                      />
                    </EuiButtonEmpty>
                  </EuiFlexItem>
                )}
              </Fragment>
            )}
            {progress > 0 && (
              <Fragment>
                <EuiFlexItem grow={false}>
                  <EuiButton onClick={viewResults} data-test-subj="mlJobWizardButtonViewResults">
                    <FormattedMessage
                      id="xpack.ml.newJob.wizard.summaryStep.viewResultsButton"
                      defaultMessage="View results"
                    />
                  </EuiButton>
                </EuiFlexItem>
              </Fragment>
            )}
            {progress === 100 && (
              <Fragment>
                <EuiFlexItem grow={false}>
                  <EuiButton onClick={clickResetJob} data-test-subj="mlJobWizardButtonResetJob">
                    <FormattedMessage
                      id="xpack.ml.newJob.wizard.summaryStep.resetJobButton"
                      defaultMessage="Reset job"
                    />
                  </EuiButton>
                </EuiFlexItem>
                <PostSaveOptions jobRunner={jobRunner} />
              </Fragment>
            )}
          </EuiFlexGroup>
        </Fragment>
      )}
    </Fragment>
  );
};
