/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { FC, useState, useEffect, useCallback, useMemo } from 'react';
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
  EuiText,
  EuiFilePicker,
  EuiSpacer,
  EuiPanel,
  EuiFormRow,
  EuiFieldText,
} from '@elastic/eui';

import type { DataFrameAnalyticsConfig } from '../../../data_frame_analytics/common';
import type { JobType } from '../../../../../common/types/saved_objects';
import { useMlApiContext, useMlKibana } from '../../../contexts/kibana';
import { CannotImportJobsCallout } from './cannot_import_jobs_callout';
import { CannotReadFileCallout } from './cannot_read_file_callout';
import { isJobIdValid } from '../../../../../common/util/job_utils';
import { JOB_ID_MAX_LENGTH } from '../../../../../common/constants/validation';
import { toastNotificationServiceProvider } from '../../../services/toast_notification_service';
import { JobImportService } from './jobs_export_service';
import type { ImportedAdJob, JobIdObject, SkippedJobs } from './jobs_export_service';

interface Props {
  isDisabled: boolean;
}
export const ImportJobsFlyout: FC<Props> = ({ isDisabled }) => {
  const {
    jobs: { bulkCreateJobs, jobsExist: adJobsExist },
    dataFrameAnalytics: { createDataFrameAnalytics, jobsExist: dfaJobsExist },
  } = useMlApiContext();
  const {
    services: {
      data: {
        indexPatterns: { getTitles: getIndexPatternTitles },
      },
      notifications: { toasts },
    },
  } = useMlKibana();

  const jobImportService = useMemo(() => new JobImportService(), []);

  const [showFlyout, setShowFlyout] = useState(false);
  const [adJobs, setAdJobs] = useState<ImportedAdJob[]>([]);
  const [dfaJobs, setDfaJobs] = useState<DataFrameAnalyticsConfig[]>([]);
  const [jobIdObjects, setJobIdObjects] = useState<JobIdObject[]>([]);
  const [skippedJobs, setSkippedJobs] = useState<SkippedJobs[]>([]);
  const [importing, setImporting] = useState(false);
  const [jobType, setJobType] = useState<JobType | null>(null);
  const [totalJobsRead, setTotalJobsRead] = useState(0);
  const [importDisabled, setImportDisabled] = useState(true);
  const [deleteDisabled, setDeleteDisabled] = useState(true);
  const [idsMash, setIdsMash] = useState('');
  const [validatingJobs, setValidatingJobs] = useState(false);
  const [showFileReadError, setShowFileReadError] = useState(false);
  const { displayErrorToast, displaySuccessToast } = useMemo(
    () => toastNotificationServiceProvider(toasts),
    [toasts]
  );

  const reset = useCallback((showFileError = false) => {
    setAdJobs([]);
    setDfaJobs([]);
    setJobIdObjects([]);
    setIdsMash('');
    setImporting(false);
    setJobType(null);
    setTotalJobsRead(0);
    setValidatingJobs(false);
    setShowFileReadError(showFileError);
  }, []);

  useEffect(() => {
    reset();
  }, [showFlyout]);

  function toggleFlyout() {
    setShowFlyout(!showFlyout);
  }

  const onFilePickerChange = useCallback(async (files: any) => {
    setShowFileReadError(false);

    if (files.length === 0) {
      reset();
      return;
    }

    try {
      const loadedFile = await jobImportService.readJobConfigs(files[0]);
      if (loadedFile.jobType === null) {
        reset(true);
        return;
      }

      setTotalJobsRead(loadedFile.jobs.length);

      const validatedJobs = await jobImportService.validateJobs(
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
      setJobIdObjects(
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
      displayErrorToast(error);
    }
  }, []);

  const onImport = useCallback(async () => {
    setImporting(true);
    if (jobType === 'anomaly-detector') {
      const renamedJobs = jobImportService.renameAdJobs(jobIdObjects, adJobs);
      try {
        await bulkCreateADJobs(renamedJobs);
      } catch (error) {
        // display unexpected error
        displayErrorToast(error);
      }
    } else if (jobType === 'data-frame-analytics') {
      const renamedJobs = jobImportService.renameDfaJobs(jobIdObjects, dfaJobs);
      await bulkCreateDfaJobs(renamedJobs);
    }

    setImporting(false);
    setShowFlyout(false);
  }, [jobType, jobIdObjects, adJobs, dfaJobs]);

  const bulkCreateADJobs = useCallback(async (jobs: ImportedAdJob[]) => {
    const results = await bulkCreateJobs(jobs);
    let successCount = 0;
    Object.entries(results).forEach(([jobId, { job, datafeed }]) => {
      if (job.error || datafeed.error) {
        if (job.error) {
          const title = i18n.translate('xpack.ml.importExport.importFlyout.importADJobError', {
            defaultMessage: 'Could not create job {jobId}',
            values: { jobId },
          });
          displayErrorToast(job.error, title);
        }
        if (datafeed.error) {
          const title = i18n.translate('xpack.ml.importExport.importFlyout.importDatafeedError', {
            defaultMessage: 'Could not create datafeed for job {jobId}',
            values: { jobId },
          });
          displayErrorToast(datafeed.error, title);
        }
      } else {
        successCount++;
      }
    });

    if (successCount > 0) {
      displayImportSuccessToast(successCount);
    }
  }, []);

  const bulkCreateDfaJobs = useCallback(async (jobs: DataFrameAnalyticsConfig[]) => {
    const results = await Promise.all(
      jobs.map(async ({ id, ...config }) => {
        try {
          return await createDataFrameAnalytics(id, config);
        } catch (error) {
          const title = i18n.translate('xpack.ml.importExport.importFlyout.importDFAJobError', {
            defaultMessage: 'Could not create job {id}',
            values: { id },
          });
          displayErrorToast(error, title);
        }
      })
    );
    const successCount = Object.values(results).filter((job) => job !== undefined).length;
    if (successCount > 0) {
      displayImportSuccessToast(successCount);
    }
  }, []);

  const displayImportSuccessToast = useCallback((count: number) => {
    const title = i18n.translate('xpack.ml.importExport.importFlyout.importJobSuccessToast', {
      defaultMessage: '{count, plural, one {# job} other {# jobs}} successfully imported',
      values: { count },
    });
    displaySuccessToast(title);
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
      const js = [...jobIdObjects];
      js.splice(index, 1);
      setJobIdObjects(js);
      setIdsMash(js.map(({ id }) => id).join(''));
      setValidatingJobs(true);
    },
    [jobIdObjects, adJobs, dfaJobs]
  );

  useEffect(() => {
    const disabled =
      jobIdObjects.length === 0 ||
      importing === true ||
      validatingJobs === true ||
      jobIdObjects.some(({ valid }) => valid === false);
    setImportDisabled(disabled);

    setDeleteDisabled(importing === true || validatingJobs === true);
  }, [jobIdObjects, idsMash, validatingJobs, importing]);

  const validateIds = useCallback(async () => {
    const existsChecks: string[] = [];
    jobIdObjects.forEach((j) => {
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
        jobIdObjects.forEach((j) => {
          if (j.valid === true) {
            // only apply the exists result if the previous checks are ok
            const hh = resp[j.id];
            j.valid = !hh.exists;
            j.invalidMessage = hh.exists ? jobExists : '';
          }
        });
        setJobIdObjects([...jobIdObjects]);
        setValidatingJobs(false);
      });
    }
  }, [idsMash, jobIdObjects]);

  useDebounce(validateIds, 400, [idsMash]);

  const renameJob = useCallback(
    (id: string, i: number) => {
      jobIdObjects[i].id = id;
      jobIdObjects[i].valid = false;
      setJobIdObjects([...jobIdObjects]);
      setIdsMash(jobIdObjects.map(({ id: jId }) => jId).join(''));
      setValidatingJobs(true);
    },
    [jobIdObjects]
  );

  const DeleteJobButton: FC<{ index: number }> = ({ index }) => (
    <EuiButtonIcon
      iconType="trash"
      aria-label={i18n.translate('xpack.ml.importExport.importFlyout.deleteButtonAria', {
        defaultMessage: 'Delete',
      })}
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
              <EuiText textAlign="center">
                <EuiFilePicker
                  disabled={importing}
                  fullWidth
                  id="filePicker"
                  initialPromptText={i18n.translate(
                    'xpack.ml.importExport.importFlyout.fileSelect',
                    {
                      defaultMessage: 'Select or drag and drop a file',
                    }
                  )}
                  onChange={onFilePickerChange}
                  className="file-datavisualizer-file-picker"
                />
              </EuiText>

              {showFileReadError ? <CannotReadFileCallout /> : null}

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
                    autoExpand={jobIdObjects.length === 0 || skippedJobs.length === 1}
                  />

                  <FormattedMessage
                    id="xpack.ml.importExport.importFlyout.importableFiles"
                    defaultMessage="Import {num, plural, one {# job} other {# jobs}}"
                    values={{ num: jobIdObjects.length }}
                  />
                  <EuiSpacer size="m" />

                  {jobIdObjects.map((jobId, i) => (
                    <div key={jobId.originalId}>
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
                <EuiButtonEmpty
                  iconType="cross"
                  onClick={setShowFlyout.bind(null, false)}
                  flush="left"
                >
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
