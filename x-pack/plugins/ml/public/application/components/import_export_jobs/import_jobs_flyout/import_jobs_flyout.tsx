/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { FC, useState, useEffect, useCallback, useMemo } from 'react';
import { FormattedMessage } from '@kbn/i18n-react';
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
import { toastNotificationServiceProvider } from '../../../services/toast_notification_service';
import { JobImportService } from './jobs_import_service';
import { useValidateIds } from './validate';
import type { ImportedAdJob, JobIdObject, SkippedJobs } from './jobs_import_service';
import { ErrorType, extractErrorProperties } from '../../../../../common/util/errors';

interface Props {
  isDisabled: boolean;
}
export const ImportJobsFlyout: FC<Props> = ({ isDisabled }) => {
  const {
    jobs: { bulkCreateJobs },
    dataFrameAnalytics: { createDataFrameAnalytics },
    filters: { filters: getFilters },
  } = useMlApiContext();
  const {
    services: {
      data: {
        dataViews: { getTitles: getDataViewTitles },
      },
      notifications: { toasts },
      mlServices: { mlUsageCollection },
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

  const [validateIds] = useValidateIds(
    jobType,
    jobIdObjects,
    idsMash,
    setJobIdObjects,
    setValidatingJobs
  );
  useDebounce(validateIds, 400, [idsMash]);

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

  useEffect(
    function onFlyoutChange() {
      reset();
    },
    [showFlyout]
  );

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
        loadedFile.jobs,
        loadedFile.jobType,
        getDataViewTitles,
        getFilters
      );

      if (loadedFile.jobType === 'anomaly-detector') {
        const tempJobs = (loadedFile.jobs as ImportedAdJob[]).filter((j) =>
          validatedJobs.jobs.map(({ jobId }) => jobId).includes(j.job.job_id)
        );
        setAdJobs(tempJobs);
      } else if (loadedFile.jobType === 'data-frame-analytics') {
        const tempJobs = (loadedFile.jobs as DataFrameAnalyticsConfig[]).filter((j) =>
          validatedJobs.jobs.map(({ jobId }) => jobId).includes(j.id)
        );
        setDfaJobs(tempJobs);
      }

      setJobType(loadedFile.jobType);
      setJobIdObjects(
        validatedJobs.jobs.map(({ jobId, destIndex }) => ({
          jobId,
          originalId: jobId,
          jobIdValid: true,
          jobIdInvalidMessage: '',
          jobIdValidated: false,
          destIndex,
          originalDestIndex: destIndex,
          destIndexValid: true,
          destIndexInvalidMessage: '',
          destIndexValidated: false,
        }))
      );

      const ids = createIdsMash(validatedJobs.jobs as JobIdObject[], loadedFile.jobType);
      setIdsMash(ids);
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
        mlUsageCollection.count('imported_anomaly_detector_jobs', renamedJobs.length);
      } catch (error) {
        // display unexpected error
        displayErrorToast(error);
      }
    } else if (jobType === 'data-frame-analytics') {
      const renamedJobs = jobImportService.renameDfaJobs(jobIdObjects, dfaJobs);
      await bulkCreateDfaJobs(renamedJobs);
      mlUsageCollection.count('imported_data_frame_analytics_jobs', renamedJobs.length);
    }

    setImporting(false);
    setShowFlyout(false);
  }, [jobType, jobIdObjects, adJobs, dfaJobs]);

  const bulkCreateADJobs = useCallback(async (jobs: ImportedAdJob[]) => {
    const results = await bulkCreateJobs(jobs);
    let successCount = 0;
    const errors: ErrorType[] = [];
    const failedJobIds = new Set();
    Object.entries(results).forEach(([jobId, { job, datafeed }]) => {
      if (job.error || datafeed.error) {
        failedJobIds.add(jobId);
        if (job.error) {
          errors.push(job.error);
        }
        if (datafeed.error) {
          errors.push(datafeed.error);
        }
      } else {
        successCount++;
      }
    });

    if (successCount > 0) {
      displayImportSuccessToast(successCount);
    }
    if (errors.length > 0) {
      displayImportErrorToast(errors, failedJobIds.size);
      mlUsageCollection.count('import_failed_anomaly_detector_jobs', failedJobIds.size);
    }
  }, []);

  const bulkCreateDfaJobs = useCallback(async (jobs: DataFrameAnalyticsConfig[]) => {
    const errors: ErrorType[] = [];
    const results = await Promise.all(
      jobs.map(async ({ id, ...config }) => {
        try {
          return await createDataFrameAnalytics(id, config);
        } catch (error) {
          errors.push(error);
        }
      })
    );
    const successCount = Object.values(results).filter((job) => job !== undefined).length;
    if (successCount > 0) {
      displayImportSuccessToast(successCount);
    }
    if (errors.length > 0) {
      displayImportErrorToast(errors, errors.length);
      mlUsageCollection.count('import_failed_data_frame_analytics_jobs', errors.length);
    }
  }, []);

  const displayImportSuccessToast = useCallback((count: number) => {
    const title = i18n.translate('xpack.ml.importExport.importFlyout.importJobSuccessToast', {
      defaultMessage: '{count, plural, one {# job} other {# jobs}} successfully imported',
      values: { count },
    });
    displaySuccessToast(title);
  }, []);

  const displayImportErrorToast = useCallback((errors: ErrorType[], failureCount: number) => {
    const title = i18n.translate('xpack.ml.importExport.importFlyout.importJobErrorToast', {
      defaultMessage: '{count, plural, one {# job} other {# jobs}} failed to import correctly',
      values: { count: failureCount },
    });

    const errorList = errors.map(extractErrorProperties);
    displayErrorToast(errorList as unknown as ErrorType, title);
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

      const ids = createIdsMash(js, jobType);
      setIdsMash(ids);
      setValidatingJobs(true);
    },
    [jobIdObjects, adJobs, dfaJobs]
  );

  useEffect(() => {
    const disabled =
      jobIdObjects.length === 0 ||
      importing === true ||
      validatingJobs === true ||
      jobIdObjects.some(
        ({ jobIdValid, destIndexValid }) => jobIdValid === false || destIndexValid === false
      );
    setImportDisabled(disabled);

    setDeleteDisabled(importing === true || validatingJobs === true);
  }, [jobIdObjects, idsMash, validatingJobs, importing]);

  const renameJob = useCallback(
    (id: string, i: number) => {
      jobIdObjects[i].jobId = id;
      jobIdObjects[i].jobIdValid = false;
      jobIdObjects[i].jobIdValidated = false;
      setJobIdObjects([...jobIdObjects]);

      const ids = createIdsMash(jobIdObjects, jobType);
      setIdsMash(ids);
      setValidatingJobs(true);
    },
    [jobIdObjects]
  );

  const renameDestIndex = useCallback(
    (id: string, i: number) => {
      jobIdObjects[i].destIndex = id;
      jobIdObjects[i].destIndexValid = false;
      jobIdObjects[i].destIndexValidated = false;
      jobIdObjects[i].destIndexInvalidMessage = '';
      setJobIdObjects([...jobIdObjects]);

      const ids = createIdsMash(jobIdObjects, jobType);
      setIdsMash(ids);
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
      color={deleteDisabled ? 'text' : 'danger'}
      disabled={deleteDisabled}
      onClick={() => deleteJob(index)}
    />
  );

  return (
    <>
      <FlyoutButton onClick={toggleFlyout} isDisabled={isDisabled} />

      {showFlyout === true && isDisabled === false && (
        <EuiFlyout
          onClose={setShowFlyout.bind(null, false)}
          hideCloseButton
          size="m"
          data-test-subj="mlJobMgmtImportJobsFlyout"
        >
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
                <div data-test-subj="mlJobMgmtImportJobsFileRead">
                  <EuiSpacer size="l" />
                  {jobType === 'anomaly-detector' && (
                    <div data-test-subj="mlJobMgmtImportJobsADTitle">
                      <FormattedMessage
                        id="xpack.ml.importExport.importFlyout.selectedFiles.ad"
                        defaultMessage="{num} anomaly detection {num, plural, one {job} other {jobs}} read from file"
                        values={{ num: totalJobsRead }}
                      />
                    </div>
                  )}

                  {jobType === 'data-frame-analytics' && (
                    <div data-test-subj="mlJobMgmtImportJobsDFATitle">
                      <FormattedMessage
                        id="xpack.ml.importExport.importFlyout.selectedFiles.dfa"
                        defaultMessage="{num} data frame analytics {num, plural, one {job} other {jobs}} read from file"
                        values={{ num: totalJobsRead }}
                      />
                    </div>
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
                              error={jobId.jobIdInvalidMessage}
                              isInvalid={jobId.jobIdValid === false}
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
                                value={jobId.jobId}
                                onChange={(e) => renameJob(e.target.value, i)}
                                isInvalid={jobId.jobIdValid === false}
                                data-test-subj="mlJobMgmtImportJobIdInput"
                              />
                            </EuiFormRow>

                            {jobType === 'data-frame-analytics' && (
                              <EuiFormRow
                                helpText={
                                  jobId.destIndexValid === true ? jobId.destIndexInvalidMessage : ''
                                }
                                error={
                                  jobId.destIndexValid === false
                                    ? jobId.destIndexInvalidMessage
                                    : ''
                                }
                                isInvalid={jobId.destIndexValid === false}
                              >
                                <EuiFieldText
                                  prepend={i18n.translate(
                                    'xpack.ml.importExport.importFlyout.destIndex',
                                    {
                                      defaultMessage: 'Destination index',
                                    }
                                  )}
                                  disabled={importing}
                                  compressed={true}
                                  value={jobId.destIndex}
                                  onChange={(e) => renameDestIndex(e.target.value, i)}
                                  isInvalid={jobId.destIndexValid === false}
                                />
                              </EuiFormRow>
                            )}
                          </EuiFlexItem>
                          <EuiFlexItem grow={false}>
                            <DeleteJobButton index={i} />
                          </EuiFlexItem>
                        </EuiFlexGroup>
                      </EuiPanel>
                      <EuiSpacer size="m" />
                    </div>
                  ))}
                </div>
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
                <EuiButton
                  disabled={importDisabled}
                  onClick={onImport}
                  fill
                  data-test-subj="mlJobMgmtImportImportButton"
                >
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
      data-test-subj="mlJobsImportButton"
    >
      <FormattedMessage id="xpack.ml.importExport.importButton" defaultMessage="Import jobs" />
    </EuiButtonEmpty>
  );
};

function createIdsMash(jobIdObjects: JobIdObject[], jobType: JobType | null) {
  return (
    jobIdObjects.map(({ jobId }) => jobId).join('') +
    (jobType === 'data-frame-analytics'
      ? jobIdObjects.map(({ destIndex }) => destIndex).join('')
      : '')
  );
}
