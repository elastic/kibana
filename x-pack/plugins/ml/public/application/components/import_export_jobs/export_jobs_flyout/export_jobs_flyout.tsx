/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { FC, useState, useEffect, useMemo } from 'react';
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
  EuiSpacer,
  EuiCheckbox,
  EuiTabs,
  EuiTab,
  EuiLoadingSpinner,
} from '@elastic/eui';

import { useMlApiContext, useMlKibana } from '../../../contexts/kibana';
import { JobsExportService } from './jobs_export_service';
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
  const { displayErrorToast, displaySuccessToast } = useMemo(
    () => toastNotificationServiceProvider(toasts),
    [toasts]
  );

  useEffect(() => {
    setLoadingADJobs(true);
    setLoadingDFAJobs(true);
    setAdJobIds([]);
    setSelectedJobIds([]);
    setExporting(false);
    setSelectedJobType(currentTab);

    if (showFlyout) {
      getJobs()
        .then(({ jobs }) => {
          setLoadingADJobs(false);
          setAdJobIds(jobs.map((j) => j.job_id));
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
  }, [showFlyout]);

  function toggleFlyout() {
    setShowFlyout(!showFlyout);
  }

  async function onExport() {
    setExporting(true);
    const title = i18n.translate('xpack.ml.importExport.exportFlyout.exportDownloading', {
      defaultMessage: 'Your file is downloading in the background',
      values: { count: selectedJobIds.length },
    });
    displaySuccessToast(title);

    try {
      if (selectedJobType === 'anomaly-detector') {
        await jobsExportService.exportAnomalyDetectionJobs(selectedJobIds);
      } else {
        await jobsExportService.exportDataframeAnalyticsJobs(selectedJobIds);
      }

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

  function changeTab(jobType: JobType) {
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
        <EuiFlyout onClose={() => setShowFlyout(false)} hideCloseButton size="s">
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
            <EuiTabs size="s">
              <EuiTab
                isSelected={selectedJobType === 'anomaly-detector'}
                onClick={changeTab.bind(null, 'anomaly-detector')}
                disabled={exporting}
              >
                <FormattedMessage
                  id="xpack.ml.importExport.exportFlyout.adTab"
                  defaultMessage="Anomaly detection"
                />
              </EuiTab>
              <EuiTab
                isSelected={selectedJobType === 'data-frame-analytics'}
                onClick={changeTab.bind(null, 'data-frame-analytics')}
                disabled={exporting}
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
                      <EuiButtonEmpty size="xs" onClick={onSelectAll} isDisabled={isDisabled}>
                        <FormattedMessage
                          id="xpack.ml.importExport.exportFlyout.adSelectAllButton"
                          defaultMessage="Select all"
                        />
                      </EuiButtonEmpty>

                      <EuiSpacer size="xs" />

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
                      <EuiButtonEmpty size="xs" onClick={onSelectAll} isDisabled={isDisabled}>
                        <FormattedMessage
                          id="xpack.ml.importExport.exportFlyout.dfaSelectAllButton"
                          defaultMessage="Select all"
                        />
                      </EuiButtonEmpty>

                      <EuiSpacer size="xs" />

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
      data-test-subj="mlJobWizardButtonPreviewJobJson"
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
