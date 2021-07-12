/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { FC, useState, useEffect, useCallback } from 'react';
import { FormattedMessage } from '@kbn/i18n/react';
import useDebounce from 'react-use/lib/useDebounce';
import { i18n } from '@kbn/i18n';

import {
  EuiFlyout,
  EuiFlyoutFooter,
  EuiFlyoutHeader,
  EuiFlexGroup,
  EuiFlexItem,
  EuiButtonEmpty,
  EuiButton,
  EuiButtonIcon,
  EuiFlyoutBody,
  EuiTitle,
  EuiFilePicker,
  EuiSpacer,
  EuiPanel,
  EuiFormRow,
  EuiFieldText,
} from '@elastic/eui';

import type { Job, Datafeed } from '../../../../../common/types/anomaly_detection_jobs';
import { DataFrameAnalyticsConfig } from '../../../data_frame_analytics/common';
import { useMlApiContext, useMlKibana } from '../../../contexts/kibana';
import { JobType } from '../../../../../common/types/saved_objects';
import { CannotImportJobsCallout, SkippedJobs } from './cannot_import_jobs_callout';
import { CannotReadFileCallout } from './cannot_read_file_callout';
import { isJobIdValid } from '../../../../../common/util/job_utils';
import { JOB_ID_MAX_LENGTH } from '../../../../../common/constants/validation';

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

interface JobId {
  id: string;
  originalId: string;
  valid: boolean;
  invalidMessage: string;
}

interface Props {
  isDisabled: boolean;
  refreshJobs(): void;
}
export const ImportJobsFlyout: FC<Props> = ({ isDisabled, refreshJobs }) => {
  const {
    jobs: { bulkCreateJobs, jobsExist: adJobsExist },
    dataFrameAnalytics: { createDataFrameAnalytics, jobsExist: dfaJobsExist },
  } = useMlApiContext();
  const {
    services: {
      data: {
        indexPatterns: { getTitles: getIndexPatternTitles },
      },
    },
  } = useMlKibana();
  const [showFlyout, setShowFlyout] = useState(false);
  const [adJobs, setAdJobs] = useState<ImportedAdJob[]>([]);
  const [dfaJobs, setDfaJobs] = useState<DataFrameAnalyticsConfig[]>([]);
  const [jobIds, setJobIds] = useState<JobId[]>([]);
  const [skippedJobs, setSkippedJobs] = useState<SkippedJobs[]>([]);
  const [importing, setImporting] = useState(false);
  const [jobType, setJobType] = useState<JobType | null>(null);
  const [totalJobsRead, setTotalJobsRead] = useState(0);
  const [importDisabled, setImportDisabled] = useState(true);
  const [deleteDisabled, setDeleteDisabled] = useState(true);
  const [idsMash, setIdsMash] = useState('');
  const [validatingJobs, setValidatingJobs] = useState(false);
  const [showFileReadError, setShowFileReadError] = useState(false);

  useEffect(() => {
    setAdJobs([]);
    setDfaJobs([]);
    setJobIds([]);
    setIdsMash('');
    setImporting(false);
    setJobType(null);
    setTotalJobsRead(0);
    setValidatingJobs(false);
  }, [showFlyout]);

  function toggleFlyout() {
    setShowFlyout(!showFlyout);
  }

  const onFilePickerChange = useCallback(async (files: any) => {
    setShowFileReadError(false);
    if (files.length) {
      try {
        const loadedFile = await readJobConfigs(files[0]);
        if (loadedFile.jobType === null) {
          setShowFileReadError(true);
          return;
        }

        setTotalJobsRead(loadedFile.jobs.length);

        const validatedJobs = await validateJobs(
          loadedFile.jobs as ImportedAdJob[],
          loadedFile.jobType,
          getIndexPatternTitles
        );

        if (loadedFile.jobType === 'anomaly-detector') {
          const tempJobs = (loadedFile.jobs as ImportedAdJob[]).filter((j) =>
            validatedJobs.jobIds.includes(j.job.job_id)
          );
          setAdJobs(tempJobs);
        } else if (loadedFile.jobType === 'data-frame-analytics') {
          const tempJobs = (loadedFile.jobs as DataFrameAnalyticsConfig[]).filter((j) =>
            validatedJobs.jobIds.includes(j.id)
          );
          setDfaJobs(tempJobs);
        }

        setJobType(loadedFile.jobType);
        setJobIds(
          validatedJobs.jobIds.map((id) => ({
            id,
            originalId: id,
            valid: true,
            invalidMessage: '',
          }))
        );
        setIdsMash(validatedJobs.jobIds.map((id) => id).join(''));
        setValidatingJobs(true);
        setSkippedJobs(validatedJobs.skippedJobs);
      } catch (error) {
        // show error
      }
    } else {
      setAdJobs([]);
      setDfaJobs([]);
      setJobIds([]);
      setIdsMash('');
      setImporting(false);
      setJobType(null);
      setTotalJobsRead(0);
      setValidatingJobs(false);
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

  const deleteJob = useCallback(
    (index: number) => {
      if (jobType === 'anomaly-detector') {
        const js = [...adJobs];
        js.splice(index, 1);
        setAdJobs(js);
      } else if (jobType === 'data-frame-analytics') {
        const js = [...dfaJobs];
        js.splice(index, 1);
        setDfaJobs(js);
      }
      const js = [...jobIds];
      js.splice(index, 1);
      setJobIds(js);
      setIdsMash(js.map(({ id }) => id).join(''));
      setValidatingJobs(true);
    },
    [jobIds, adJobs, dfaJobs]
  );

  useEffect(() => {
    const disabled =
      jobIds.length === 0 ||
      importing === true ||
      validatingJobs === true ||
      jobIds.some(({ valid }) => valid === false);
    setImportDisabled(disabled);

    setDeleteDisabled(importing === true || validatingJobs === true);
  }, [jobIds, idsMash, validatingJobs, importing]);

  const validateIds = useCallback(async () => {
    const existsChecks: string[] = [];
    jobIds.forEach((j) => {
      existsChecks.push(j.id);
      j.valid = true;
      j.invalidMessage = '';

      if (j.id === '') {
        j.valid = false;
        j.invalidMessage = jobEmpty;
        return;
      }
      if (j.id.length > JOB_ID_MAX_LENGTH) {
        j.valid = false;
        j.invalidMessage = jobInvalidLength;
        return;
      }
      if (isJobIdValid(j.id) === false) {
        j.valid = false;
        j.invalidMessage = jobInvalid;
        return;
      }
    });

    if (jobType !== null) {
      const jobsExist = jobType === 'anomaly-detector' ? adJobsExist : dfaJobsExist;
      jobsExist(existsChecks, true).then((resp) => {
        jobIds.forEach((j) => {
          if (j.valid === true) {
            // only apply the exists result if the previous checks are ok
            const hh = resp[j.id];
            j.valid = !hh.exists;
            j.invalidMessage = hh.exists ? jobExists : '';
          }
        });
        setJobIds([...jobIds]);
        setValidatingJobs(false);
      });
    }
  }, [idsMash, jobIds]);

  const renameJob = useCallback(
    (id: string, i: number) => {
      jobIds[i].id = id;
      jobIds[i].valid = false;
      setJobIds([...jobIds]);
      setIdsMash(jobIds.map(({ id: jId }) => jId).join(''));
      setValidatingJobs(true);
    },
    [jobIds]
  );

  useDebounce(validateIds, 400, [idsMash]);

  const DeleteJobButton: FC<{ index: number }> = ({ index }) => (
    <EuiButtonIcon
      iconType="trash"
      aria-label="Delete"
      color={deleteDisabled ? 'subdued' : 'danger'}
      disabled={deleteDisabled}
      onClick={() => deleteJob(index)}
    />
  );

  return (
    <>
      <FlyoutButton onClick={toggleFlyout} isDisabled={isDisabled} />

      {showFlyout === true && isDisabled === false && (
        <EuiFlyout onClose={() => setShowFlyout(false)} hideCloseButton size="m">
          <EuiFlyoutHeader hasBorder>
            <EuiTitle size="m">
              <h2>
                <FormattedMessage
                  id="xpack.ml.importExport.importFlyout.flyoutHeader"
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
                    'xpack.ml.importExport.importFlyout.fileSelect',
                    {
                      defaultMessage: 'Select or drag and drop a file',
                    }
                  )}
                  onChange={(files) => onFilePickerChange(files)}
                  className="file-datavisualizer-file-picker"
                />
              </div>

              {showFileReadError && <CannotReadFileCallout />}

              {totalJobsRead > 0 && jobType !== null && (
                <>
                  <EuiSpacer size="l" />
                  {jobType === 'anomaly-detector' && (
                    <FormattedMessage
                      id="xpack.ml.importExport.importFlyout.selectedFiles.ad"
                      defaultMessage="{num} anomaly detection {num, plural, one {job} other {jobs}} read from file"
                      values={{ num: totalJobsRead }}
                    />
                  )}

                  {jobType === 'data-frame-analytics' && (
                    <FormattedMessage
                      id="xpack.ml.importExport.importFlyout.selectedFiles.dfa"
                      defaultMessage="{num} data frame analytics {num, plural, one {job} other {jobs}} read from file"
                      values={{ num: totalJobsRead }}
                    />
                  )}

                  <EuiSpacer size="m" />

                  <CannotImportJobsCallout
                    jobs={skippedJobs}
                    autoExpand={jobIds.length === 0 || skippedJobs.length === 1}
                  />

                  <FormattedMessage
                    id="xpack.ml.importExport.importFlyout.importableFiles"
                    defaultMessage="{num} importable {num, plural, one {job} other {jobs}}"
                    values={{ num: jobIds.length }}
                  />
                  <EuiSpacer size="m" />

                  {jobIds.map((jobId, i) => (
                    <div key={i}>
                      <EuiPanel hasBorder={true}>
                        <EuiFlexGroup>
                          <EuiFlexItem>
                            <EuiFormRow
                              error={jobId.invalidMessage}
                              isInvalid={jobId.invalidMessage.length > 0}
                            >
                              <EuiFieldText
                                prepend={i18n.translate(
                                  'xpack.ml.importExport.importFlyout.jobId',
                                  {
                                    defaultMessage: 'Job ID',
                                  }
                                )}
                                disabled={importing}
                                compressed={true}
                                value={jobId.id}
                                onChange={(e) => renameJob(e.target.value, i)}
                                isInvalid={jobId.valid === false}
                              />
                            </EuiFormRow>
                          </EuiFlexItem>
                          <EuiFlexItem grow={false}>
                            <DeleteJobButton index={i} />
                          </EuiFlexItem>
                        </EuiFlexGroup>
                      </EuiPanel>
                      <EuiSpacer size="m" />
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
                    id="xpack.ml.importExport.importFlyout.closeButton"
                    defaultMessage="Close"
                  />
                </EuiButtonEmpty>
              </EuiFlexItem>
              <EuiFlexItem grow={false}>
                <EuiButton disabled={importDisabled} onClick={onImport} fill>
                  <FormattedMessage
                    id="xpack.ml.importExport.importFlyout.closeButton.importButton"
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
      <FormattedMessage id="xpack.ml.importExport.importButton" defaultMessage="Import jobs" />
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

function renameAdJobs(jobIds: JobId[], jobs: ImportedAdJob[]) {
  if (jobs.length !== jobs.length) {
    return jobs;
  }

  return jobs.map((j, i) => {
    const { id } = jobIds[i];
    j.job.job_id = id;
    j.datafeed.job_id = id;
    j.datafeed.datafeed_id = `datafeed-${id}`;
    return j;
  });
}

function renameDfaJobs(jobIds: JobId[], jobs: DataFrameAnalyticsConfig[]) {
  if (jobs.length !== jobs.length) {
    return jobs;
  }

  return jobs.map((j, i) => {
    const { id } = jobIds[i];
    j.id = id;
    return j;
  });
}

async function validateJobs(
  jobs: ImportedAdJob[] | DataFrameAnalyticsConfig[],
  type: JobType,
  getIndexPatternTitles: (refresh?: boolean) => Promise<string[]>
) {
  const existingIndexPatterns = new Set(await getIndexPatternTitles());
  const tempJobIds: string[] = [];
  const tempSkippedJobIds: SkippedJobs[] = [];

  const commonJobs: Array<{ jobId: string; indices: string[] }> =
    type === 'anomaly-detector'
      ? (jobs as ImportedAdJob[]).map((j) => ({
          jobId: j.job.job_id,
          indices: j.datafeed.indices,
        }))
      : (jobs as DataFrameAnalyticsConfig[]).map((j) => ({
          jobId: j.id,
          indices: Array.isArray(j.source.index) ? j.source.index : [j.source.index],
        }));

  commonJobs.forEach(({ jobId, indices }) => {
    const missingIndices = indices.filter((i) => existingIndexPatterns.has(i) === false);
    if (missingIndices.length === 0) {
      tempJobIds.push(jobId);
    } else {
      tempSkippedJobIds.push({
        jobId,
        missingIndices,
      });
    }
  });

  return {
    jobIds: tempJobIds,
    skippedJobs: tempSkippedJobIds,
  };
}

const jobEmpty = i18n.translate('xpack.ml.importExport.importFlyout.validateJobId.jobNameEmpty', {
  defaultMessage: 'Enter a valid job ID',
});
const jobInvalid = i18n.translate(
  'xpack.ml.importExport.importFlyout.validateJobId.jobNameAllowedCharacters',
  {
    defaultMessage:
      'Job ID can contain lowercase alphanumeric (a-z and 0-9), hyphens or underscores; ' +
      'must start and end with an alphanumeric character',
  }
);
const jobInvalidLength = i18n.translate(
  'xpack.ml.importExport.importFlyout.validateJobId.jobIdInvalidMaxLengthErrorMessage',
  {
    defaultMessage:
      'Job ID must be no more than {maxLength, plural, one {# character} other {# characters}} long.',
    values: {
      maxLength: JOB_ID_MAX_LENGTH,
    },
  }
);
const jobExists = i18n.translate(
  'xpack.ml.importExport.importFlyout.validateJobId.jobNameAlreadyExists',
  {
    defaultMessage:
      'Job ID already exists. A job ID cannot be the same as an existing job or group.',
  }
);
