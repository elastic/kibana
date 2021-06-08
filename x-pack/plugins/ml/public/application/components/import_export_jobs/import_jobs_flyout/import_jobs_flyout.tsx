/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { FC, useState, useEffect, useCallback } from 'react';
import { FormattedMessage } from '@kbn/i18n/react';
import { i18n } from '@kbn/i18n';

import {
  EuiFlyout,
  EuiFlyoutFooter,
  EuiFlyoutHeader,
  EuiFlexGroup,
  EuiFlexItem,
  EuiButtonEmpty,
  EuiButton,
  EuiFlyoutBody,
  EuiTitle,
  EuiFilePicker,
  EuiSpacer,
} from '@elastic/eui';

import type { Job, Datafeed } from '../../../../../common/types/anomaly_detection_jobs';
import { DataFrameAnalyticsConfig } from '../../../data_frame_analytics/common';
import { useMlApiContext } from '../../../contexts/kibana';
import { JobType } from '../../../../../common/types/saved_objects';
import { JobIdInput } from './job_id_input';

interface ImportedAdJob {
  job: Job;
  datafeed: Datafeed;
}

function isImportedAdJobs(obj: any): obj is ImportedAdJob[] {
  return Array.isArray(obj) && obj.some((o) => o.job && o.datafeed);
}

function isDataFrameAnalyticsConfigs(obj: any): obj is DataFrameAnalyticsConfig[] {
  return Array.isArray(obj) && obj.some((o) => o.dest && o.analysis);
}

interface Props {
  isDisabled: boolean;
  refreshJobs(): void;
}
export const ImportJobsFlyout: FC<Props> = ({ isDisabled, refreshJobs }) => {
  const {
    jobs: { bulkCreateJobs },
    dataFrameAnalytics: { createDataFrameAnalytics },
  } = useMlApiContext();
  const [showFlyout, setShowFlyout] = useState(false);
  const [adJobs, setAdJobs] = useState<ImportedAdJob[]>([]);
  const [dfaJobs, setDfaJobs] = useState<DataFrameAnalyticsConfig[]>([]);
  const [jobIds, setJobIds] = useState<string[]>([]);
  const [importing, setImporting] = useState(false);
  const [jobType, setJobType] = useState<JobType | null>('anomaly-detector');
  const [jobIdsValid, setJobIdsValid] = useState<boolean[]>([]);

  useEffect(() => {
    setAdJobs([]);
    setDfaJobs([]);
    setJobIds([]);
    setImporting(false);
  }, [showFlyout]);

  function toggleFlyout() {
    setShowFlyout(!showFlyout);
  }

  const onFilePickerChange = useCallback(async (files: any) => {
    if (files.length) {
      try {
        const gg = await readJobConfigs(files[0]);
        if (gg.jobType === 'anomaly-detector') {
          setAdJobs(gg.jobs as ImportedAdJob[]);
        } else if (gg.jobType === 'data-frame-analytics') {
          setDfaJobs(gg.jobs as DataFrameAnalyticsConfig[]);
        }
        setJobType(gg.jobType);
        setJobIds(gg.jobIds);
        setJobIdsValid(gg.jobIds.map((j) => false));
      } catch (error) {
        // show error
      }
    } else {
      setAdJobs([]);
      setDfaJobs([]);
      setJobIds([]);
    }
  }, []);

  const onImport = useCallback(async () => {
    setImporting(true);
    if (jobType === 'anomaly-detector') {
      const renamedJobs = renameAdJobs(jobIds, adJobs);
      await bulkCreateJobs(renamedJobs);
      // TODO show errors
    } else if (jobType === 'data-frame-analytics') {
      const renamedJobs = renameDfaJobs(jobIds, dfaJobs);
      await bulkCreateDfaJobs(renamedJobs);
    }
    setImporting(false);
    setShowFlyout(false);
    refreshJobs();
  }, [jobType, jobIds, adJobs, dfaJobs]);

  const bulkCreateDfaJobs = useCallback(async (jobs: DataFrameAnalyticsConfig[]) => {
    Promise.all(
      jobs.map(async ({ id, ...config }) => {
        try {
          await createDataFrameAnalytics(id, config);
        } catch (error) {
          // TODO show errors
        }
      })
    );
  }, []);

  const renameJob = useCallback(
    (index: number, id: string) => {
      const js = [...jobIds];
      js[index] = id;
      setJobIds(js);
    },
    [jobIds]
  );

  const setJobIdValid = useCallback((index: number, valid: boolean) => {
    const validIds = [...jobIdsValid];
    validIds[index] = valid;
    setJobIdsValid(validIds);
  }, []);

  return (
    <>
      <FlyoutButton onClick={toggleFlyout} isDisabled={isDisabled} />

      {showFlyout === true && isDisabled === false && (
        <EuiFlyout onClose={() => setShowFlyout(false)} hideCloseButton size="s">
          <EuiFlyoutHeader hasBorder>
            <EuiTitle size="m">
              <h2>
                <FormattedMessage
                  id="xpack.infra.ml.anomalyFlyout.jobSetup.flyoutHeader"
                  defaultMessage="Import jobs"
                />
              </h2>
            </EuiTitle>
          </EuiFlyoutHeader>
          <EuiFlyoutBody>
            <>
              <div style={{ textAlign: 'center' }}>
                <EuiFilePicker
                  disabled={importing}
                  fullWidth={true}
                  id="filePicker"
                  initialPromptText={i18n.translate(
                    'xpack.fileDataVisualizer.aboutPanel.selectOrDragAndDropFileDescription',
                    {
                      defaultMessage: 'Select or drag and drop a file',
                    }
                  )}
                  onChange={(files) => onFilePickerChange(files)}
                  className="file-datavisualizer-file-picker"
                />
              </div>

              {jobType === 'anomaly-detector' && adJobs.length > 0 && (
                <>
                  <EuiSpacer size="l" />
                  <FormattedMessage
                    id="xpack.infra.ml.anomalyFlyout.jobSetup.flyoutHeader"
                    defaultMessage="{num} anomaly detection {num, plural, one {job} other {jobs}} read from file"
                    values={{ num: adJobs.length }}
                  />
                  <EuiSpacer size="l" />

                  {jobIds.map((j, i) => (
                    <div key={i}>
                      <JobIdInput
                        jobType={jobType}
                        index={i}
                        id={j}
                        renameJob={renameJob}
                        disabled={importing}
                        setIsValid={setJobIdValid}
                      />
                      <EuiSpacer size="s" />
                    </div>
                  ))}
                </>
              )}
              {jobType === 'data-frame-analytics' && dfaJobs.length > 0 && (
                <>
                  <EuiSpacer size="l" />
                  <FormattedMessage
                    id="xpack.infra.ml.anomalyFlyout.jobSetup.flyoutHeader"
                    defaultMessage="{num} data frame analytics {num, plural, one {job} other {jobs}} read from file"
                    values={{ num: dfaJobs.length }}
                  />
                  <EuiSpacer size="l" />

                  {jobIds.map((j, i) => (
                    <div key={i}>
                      <JobIdInput
                        jobType={jobType}
                        index={i}
                        id={j}
                        renameJob={renameJob}
                        disabled={importing}
                        setIsValid={setJobIdValid}
                      />
                      <EuiSpacer size="s" />
                    </div>
                  ))}
                </>
              )}
            </>
          </EuiFlyoutBody>
          <EuiFlyoutFooter>
            <EuiFlexGroup justifyContent="spaceBetween">
              <EuiFlexItem grow={false}>
                <EuiButtonEmpty iconType="cross" onClick={() => setShowFlyout(false)} flush="left">
                  <FormattedMessage
                    id="xpack.ml.newJob.wizard.datafeedPreviewFlyout.closeButton"
                    defaultMessage="Close"
                  />
                </EuiButtonEmpty>
              </EuiFlexItem>
              <EuiFlexItem grow={false}>
                <EuiButton
                  disabled={jobIdsValid.some((j) => j === false) || importing === true}
                  onClick={onImport}
                  fill
                >
                  <FormattedMessage
                    id="xpack.ml.newJob.wizard.revertModelSnapshotFlyout.saveButton"
                    defaultMessage="Import"
                  />
                </EuiButton>
              </EuiFlexItem>
            </EuiFlexGroup>
          </EuiFlyoutFooter>
        </EuiFlyout>
      )}
    </>
  );
};

const FlyoutButton: FC<{ isDisabled: boolean; onClick(): void }> = ({ isDisabled, onClick }) => {
  return (
    <EuiButtonEmpty
      iconType="importAction"
      onClick={onClick}
      isDisabled={isDisabled}
      data-test-subj="mlJobWizardButtonPreviewJobJson"
    >
      <FormattedMessage
        id="xpack.ml.newJob.wizard.datafeedPreviewFlyout.showButton"
        defaultMessage="Import jobs"
      />
    </EuiButtonEmpty>
  );
};

function readFile(file: File) {
  return new Promise((resolve, reject) => {
    if (file && file.size) {
      const reader = new FileReader();
      reader.readAsText(file);

      reader.onload = (() => {
        return () => {
          const data = reader.result;
          if (typeof data === 'string') {
            try {
              const json = JSON.parse(data);
              resolve(json);
            } catch (error) {
              reject();
            }
          } else {
            reject();
          }
        };
      })();
    } else {
      reject();
    }
  });
}
async function readJobConfigs(
  file: File
): Promise<{
  jobs: ImportedAdJob[] | DataFrameAnalyticsConfig[];
  jobIds: string[];
  jobType: JobType | null;
}> {
  try {
    const json = await readFile(file);
    const jobs = Array.isArray(json) ? json : [json];

    if (isImportedAdJobs(jobs)) {
      const jobIds = jobs.map((j) => j.job.job_id);
      return { jobs, jobIds, jobType: 'anomaly-detector' };
    } else if (isDataFrameAnalyticsConfigs(jobs)) {
      const jobIds = jobs.map((j) => j.id);
      return { jobs, jobIds, jobType: 'data-frame-analytics' };
    } else {
      return { jobs: [], jobIds: [], jobType: null };
    }
  } catch (error) {
    return { jobs: [], jobIds: [], jobType: null };
  }
}

function renameAdJobs(jobIds: string[], jobs: ImportedAdJob[]) {
  if (jobs.length !== jobs.length) {
    return jobs;
  }

  return jobs.map((j, i) => {
    const jobId = jobIds[i];
    j.job.job_id = jobId;
    j.datafeed.job_id = jobId;
    j.datafeed.datafeed_id = `datafeed-${jobId}`;
    return j;
  });
}
function renameDfaJobs(jobIds: string[], jobs: DataFrameAnalyticsConfig[]) {
  if (jobs.length !== jobs.length) {
    return jobs;
  }

  return jobs.map((j, i) => {
    const jobId = jobIds[i];
    j.id = jobId;
    return j;
  });
}
