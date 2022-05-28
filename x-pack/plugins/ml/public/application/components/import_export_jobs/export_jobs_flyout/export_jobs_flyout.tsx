/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { FC, useState, useEffect, useMemo, useCallback } from 'react';
import { FormattedMessage } from '@kbn/i18n-react';
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
  EuiSpacer,
  EuiCheckbox,
  EuiTabs,
  EuiTab,
  EuiLoadingSpinner,
  EuiConfirmModal,
} from '@elastic/eui';

import { useMlApiContext, useMlKibana } from '../../../contexts/kibana';
import { ExportJobDependenciesWarningCallout } from './export_job_warning_callout';
import { JobsExportService } from './jobs_export_service';
import type { JobDependencies } from './jobs_export_service';
import { toastNotificationServiceProvider } from '../../../services/toast_notification_service';
import type { JobType } from '../../../../../common/types/saved_objects';

interface Props {
  isDisabled: boolean;
  currentTab: JobType;
}

export const ExportJobsFlyout: FC<Props> = ({ isDisabled, currentTab }) => {
  const mlApiServices = useMlApiContext();
  const {
    getJobs,
    dataFrameAnalytics: { getDataFrameAnalytics },
  } = mlApiServices;

  const {
    services: {
      notifications: { toasts },
      mlServices: { mlUsageCollection },
    },
  } = useMlKibana();

  const jobsExportService = useMemo(() => new JobsExportService(mlApiServices), []);

  const [loadingADJobs, setLoadingADJobs] = useState(true);
  const [loadingDFAJobs, setLoadingDFAJobs] = useState(true);
  const [showFlyout, setShowFlyout] = useState(false);
  const [adJobIds, setAdJobIds] = useState<string[]>([]);
  const [dfaJobIds, setDfaJobIds] = useState<string[]>([]);
  const [selectedJobIds, setSelectedJobIds] = useState<string[]>([]);
  const [exporting, setExporting] = useState(false);
  const [selectedJobType, setSelectedJobType] = useState<JobType>(currentTab);
  const [switchTabConfirmVisible, setSwitchTabConfirmVisible] = useState(false);
  const [switchTabNextTab, setSwitchTabNextTab] = useState<JobType>(currentTab);
  const { displayErrorToast, displaySuccessToast } = useMemo(
    () => toastNotificationServiceProvider(toasts),
    [toasts]
  );

  const [jobDependencies, setJobDependencies] = useState<JobDependencies>([]);
  const [selectedJobDependencies, setSelectedJobDependencies] = useState<JobDependencies>([]);

  useEffect(
    function onFlyoutChange() {
      setLoadingADJobs(true);
      setLoadingDFAJobs(true);
      setAdJobIds([]);
      setSelectedJobIds([]);
      setExporting(false);
      setSelectedJobType(currentTab);
      setSwitchTabConfirmVisible(false);

      if (showFlyout) {
        getJobs()
          .then(({ jobs }) => {
            setLoadingADJobs(false);
            setAdJobIds(jobs.map((j) => j.job_id));

            jobsExportService
              .getJobDependencies(jobs)
              .then((jobDeps) => {
                setJobDependencies(jobDeps);
                setLoadingADJobs(false);
              })
              .catch((error) => {
                const errorTitle = i18n.translate(
                  'xpack.ml.importExport.exportFlyout.calendarsError',
                  {
                    defaultMessage: 'Could not load calendars',
                  }
                );
                displayErrorToast(error, errorTitle);
              });
          })
          .catch((error) => {
            const errorTitle = i18n.translate('xpack.ml.importExport.exportFlyout.adJobsError', {
              defaultMessage: 'Could not load anomaly detection jobs',
            });
            displayErrorToast(error, errorTitle);
          });

        getDataFrameAnalytics()
          .then(({ data_frame_analytics: dataFrameAnalytics }) => {
            setLoadingDFAJobs(false);
            setDfaJobIds(dataFrameAnalytics.map((j) => j.id));
          })
          .catch((error) => {
            const errorTitle = i18n.translate('xpack.ml.importExport.exportFlyout.dfaJobsError', {
              defaultMessage: 'Could not load data frame analytics jobs',
            });
            displayErrorToast(error, errorTitle);
          });
      }
    },
    [showFlyout]
  );

  function toggleFlyout() {
    setShowFlyout(!showFlyout);
  }

  async function onExport() {
    setExporting(true);
    const title = i18n.translate('xpack.ml.importExport.exportFlyout.exportDownloading', {
      defaultMessage: 'Your file is downloading in the background',
    });
    displaySuccessToast(title);

    try {
      if (selectedJobType === 'anomaly-detector') {
        await jobsExportService.exportAnomalyDetectionJobs(selectedJobIds);
      } else {
        await jobsExportService.exportDataframeAnalyticsJobs(selectedJobIds);
      }

      mlUsageCollection.count(
        selectedJobType === 'anomaly-detector'
          ? 'exported_anomaly_detector_jobs'
          : 'exported_data_frame_analytics_jobs',
        selectedJobIds.length
      );

      setExporting(false);
      setShowFlyout(false);
    } catch (error) {
      const errorTitle = i18n.translate('xpack.ml.importExport.exportFlyout.exportError', {
        defaultMessage: 'Could not export selected jobs',
      });
      displayErrorToast(error, errorTitle);
      setExporting(false);
    }
  }

  function toggleSelectedJob(checked: boolean, id: string) {
    if (checked) {
      setSelectedJobIds([...selectedJobIds, id]);
    } else {
      setSelectedJobIds(selectedJobIds.filter((id2) => id2 !== id));
    }
  }

  const attemptTabSwitch = useCallback(
    (jobType: JobType) => {
      if (jobType === selectedJobType) {
        return;
      }
      // if the user has already selected some jobs, open a confirm modal
      // rather than changing tabs
      if (selectedJobIds.length > 0) {
        setSwitchTabNextTab(jobType);
        setSwitchTabConfirmVisible(true);
        return;
      }

      switchTab(jobType);
    },
    [selectedJobIds]
  );

  useEffect(() => {
    setSelectedJobDependencies(
      jobDependencies.filter(({ jobId }) => selectedJobIds.includes(jobId))
    );
  }, [selectedJobIds]);

  function switchTab(jobType: JobType) {
    setSwitchTabConfirmVisible(false);
    setSelectedJobIds([]);
    setSelectedJobType(jobType);
  }

  function onSelectAll() {
    const ids = selectedJobType === 'anomaly-detector' ? adJobIds : dfaJobIds;
    if (selectedJobIds.length === ids.length) {
      setSelectedJobIds([]);
    } else {
      setSelectedJobIds([...ids]);
    }
  }

  return (
    <>
      <FlyoutButton onClick={toggleFlyout} isDisabled={isDisabled} />

      {showFlyout === true && isDisabled === false && (
        <>
          <EuiFlyout
            onClose={() => setShowFlyout(false)}
            hideCloseButton
            size="s"
            data-test-subj="mlJobMgmtExportJobsFlyout"
          >
            <EuiFlyoutHeader hasBorder>
              <EuiTitle size="m">
                <h2>
                  <FormattedMessage
                    id="xpack.ml.importExport.exportFlyout.flyoutHeader"
                    defaultMessage="Export jobs"
                  />
                </h2>
              </EuiTitle>
            </EuiFlyoutHeader>
            <EuiFlyoutBody>
              <ExportJobDependenciesWarningCallout jobs={selectedJobDependencies} />
              <EuiTabs size="s">
                <EuiTab
                  isSelected={selectedJobType === 'anomaly-detector'}
                  onClick={() => attemptTabSwitch('anomaly-detector')}
                  disabled={exporting}
                  data-test-subj="mlJobMgmtExportJobsADTab"
                >
                  <FormattedMessage
                    id="xpack.ml.importExport.exportFlyout.adTab"
                    defaultMessage="Anomaly detection"
                  />
                </EuiTab>
                <EuiTab
                  isSelected={selectedJobType === 'data-frame-analytics'}
                  onClick={() => attemptTabSwitch('data-frame-analytics')}
                  disabled={exporting}
                  data-test-subj="mlJobMgmtExportJobsDFATab"
                >
                  <FormattedMessage
                    id="xpack.ml.importExport.exportFlyout.dfaTab"
                    defaultMessage="Analytics"
                  />
                </EuiTab>
              </EuiTabs>
              <EuiSpacer size="s" />
              <>
                {selectedJobType === 'anomaly-detector' && (
                  <>
                    {loadingADJobs === true ? (
                      <LoadingSpinner />
                    ) : (
                      <>
                        <EuiButtonEmpty
                          size="xs"
                          onClick={onSelectAll}
                          isDisabled={isDisabled}
                          data-test-subj="mlJobMgmtExportJobsSelectAllButton"
                        >
                          {selectedJobIds.length === adJobIds.length ? (
                            <FormattedMessage
                              id="xpack.ml.importExport.exportFlyout.adDeselectAllButton"
                              defaultMessage="Deselect all"
                            />
                          ) : (
                            <FormattedMessage
                              id="xpack.ml.importExport.exportFlyout.adSelectAllButton"
                              defaultMessage="Select all"
                            />
                          )}
                        </EuiButtonEmpty>

                        <EuiSpacer size="xs" />

                        <div data-test-subj="mlJobMgmtExportJobsADJobList">
                          {adJobIds.map((id) => (
                            <div key={id}>
                              <EuiCheckbox
                                id={id}
                                label={id}
                                checked={selectedJobIds.includes(id)}
                                onChange={(e) => toggleSelectedJob(e.target.checked, id)}
                              />
                              <EuiSpacer size="s" />
                            </div>
                          ))}
                        </div>
                      </>
                    )}
                  </>
                )}
                {selectedJobType === 'data-frame-analytics' && (
                  <>
                    {loadingDFAJobs === true ? (
                      <LoadingSpinner />
                    ) : (
                      <>
                        <EuiButtonEmpty
                          size="xs"
                          onClick={onSelectAll}
                          isDisabled={isDisabled}
                          data-test-subj="mlJobMgmtExportJobsSelectAllButton"
                        >
                          {selectedJobIds.length === dfaJobIds.length ? (
                            <FormattedMessage
                              id="xpack.ml.importExport.exportFlyout.dfaDeselectAllButton"
                              defaultMessage="Deselect all"
                            />
                          ) : (
                            <FormattedMessage
                              id="xpack.ml.importExport.exportFlyout.dfaSelectAllButton"
                              defaultMessage="Select all"
                            />
                          )}
                        </EuiButtonEmpty>

                        <EuiSpacer size="xs" />
                        <div data-test-subj="mlJobMgmtExportJobsDFAJobList">
                          {dfaJobIds.map((id) => (
                            <div key={id}>
                              <EuiCheckbox
                                id={id}
                                label={id}
                                checked={selectedJobIds.includes(id)}
                                onChange={(e) => toggleSelectedJob(e.target.checked, id)}
                              />
                              <EuiSpacer size="s" />
                            </div>
                          ))}
                        </div>
                      </>
                    )}
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
                      id="xpack.ml.importExport.exportFlyout.closeButton"
                      defaultMessage="Close"
                    />
                  </EuiButtonEmpty>
                </EuiFlexItem>
                <EuiFlexItem grow={false}>
                  <EuiButton
                    disabled={selectedJobIds.length === 0 || exporting === true}
                    onClick={onExport}
                    fill
                    data-test-subj="mlJobMgmtExportExportButton"
                  >
                    <FormattedMessage
                      id="xpack.ml.importExport.exportFlyout.exportButton"
                      defaultMessage="Export"
                    />
                  </EuiButton>
                </EuiFlexItem>
              </EuiFlexGroup>
            </EuiFlyoutFooter>
          </EuiFlyout>

          {switchTabConfirmVisible === true ? (
            <SwitchTabsConfirm
              onCancel={setSwitchTabConfirmVisible.bind(null, false)}
              onConfirm={() => switchTab(switchTabNextTab)}
            />
          ) : null}
        </>
      )}
    </>
  );
};

const FlyoutButton: FC<{ isDisabled: boolean; onClick(): void }> = ({ isDisabled, onClick }) => {
  return (
    <EuiButtonEmpty
      iconType="exportAction"
      onClick={onClick}
      isDisabled={isDisabled}
      data-test-subj="mlJobsExportButton"
    >
      <FormattedMessage id="xpack.ml.importExport.exportButton" defaultMessage="Export jobs" />
    </EuiButtonEmpty>
  );
};

const LoadingSpinner: FC = () => (
  <>
    <EuiSpacer size="l" />
    <EuiFlexGroup justifyContent="spaceAround">
      <EuiFlexItem grow={false}>
        <EuiLoadingSpinner size="l" />
      </EuiFlexItem>
    </EuiFlexGroup>
  </>
);

const SwitchTabsConfirm: FC<{ onCancel: () => void; onConfirm: () => void }> = ({
  onCancel,
  onConfirm,
}) => (
  <EuiConfirmModal
    title={i18n.translate('xpack.ml.importExport.exportFlyout.switchTabsConfirm.title', {
      defaultMessage: 'Change tabs?',
    })}
    onCancel={onCancel}
    onConfirm={onConfirm}
    cancelButtonText={i18n.translate(
      'xpack.ml.importExport.exportFlyout.switchTabsConfirm.cancelButton',
      {
        defaultMessage: 'Cancel',
      }
    )}
    confirmButtonText={i18n.translate(
      'xpack.ml.importExport.exportFlyout.switchTabsConfirm.confirmButton',
      {
        defaultMessage: 'Confirm',
      }
    )}
    defaultFocusedButton="confirm"
  >
    <p>
      <FormattedMessage
        id="xpack.ml.importExport.exportFlyout.switchTabsConfirm.text"
        defaultMessage="Changing tabs will clear currently selected jobs"
      />
    </p>
  </EuiConfirmModal>
);
