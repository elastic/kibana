/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { FC, useState, useEffect } from 'react';
import { FormattedMessage } from '@kbn/i18n/react';
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
} from '@elastic/eui';

import { useMlApiContext } from '../../../contexts/kibana';
import { utilsProvider } from './utils';
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

  const { exportAnomalyDetectionJobs, exportDataframeAnalyticsJobs } = utilsProvider(mlApiServices);

  const [showFlyout, setShowFlyout] = useState(false);
  const [adJobIds, setAdJobIds] = useState<string[]>([]);
  const [dfaJobIds, setDfaJobIds] = useState<string[]>([]);
  const [selectedJobIds, setSelectedJobIds] = useState<string[]>([]);
  const [exporting, setExporting] = useState(false);
  const [selectedJobType, setSelectedJobType] = useState<JobType>(currentTab);

  useEffect(() => {
    setAdJobIds([]);
    setSelectedJobIds([]);
    setExporting(false);
    setSelectedJobType(currentTab);

    if (showFlyout) {
      getJobs().then(({ jobs }) => {
        setAdJobIds(jobs.map((j) => j.job_id));
      });
      getDataFrameAnalytics().then(({ data_frame_analytics: dataFrameAnalytics }) => {
        setDfaJobIds(dataFrameAnalytics.map((j) => j.id));
      });
    }
  }, [showFlyout]);

  function toggleFlyout() {
    setShowFlyout(!showFlyout);
  }

  async function onExport() {
    setExporting(true);
    if (selectedJobType === 'anomaly-detector') {
      await exportAnomalyDetectionJobs(selectedJobIds);
    } else {
      await exportDataframeAnalyticsJobs(selectedJobIds);
    }
    setExporting(false);
    setShowFlyout(false);
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
                onClick={() => changeTab('anomaly-detector')}
                disabled={exporting}
              >
                <FormattedMessage
                  id="xpack.ml.importExport.exportFlyout.adTab"
                  defaultMessage="Anomaly detection"
                />
              </EuiTab>
              <EuiTab
                isSelected={selectedJobType === 'data-frame-analytics'}
                onClick={() => changeTab('data-frame-analytics')}
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
              {selectedJobType === 'data-frame-analytics' && (
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
          </EuiFlyoutBody>
          <EuiFlyoutFooter>
            <EuiFlexGroup justifyContent="spaceBetween">
              <EuiFlexItem grow={false}>
                <EuiButtonEmpty iconType="cross" onClick={() => setShowFlyout(false)} flush="left">
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
