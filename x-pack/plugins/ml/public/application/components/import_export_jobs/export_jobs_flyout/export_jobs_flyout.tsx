/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { Fragment, FC, useState, useEffect } from 'react';
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

// import { Job, Datafeed } from '../../../../../common/types/anomaly_detection_jobs';
import { useMlApiContext } from '../../../contexts/kibana';
import { exportAnomalyDetectionJobs, exportDataframeAnalyticsJobs } from '../utils';
import { JobType } from '../../../../../common/types/saved_objects';

interface Props {
  isDisabled: boolean;
}

export const ExportJobsFlyout: FC<Props> = ({ isDisabled }) => {
  const {
    getJobs,
    dataFrameAnalytics: { getDataFrameAnalytics },
  } = useMlApiContext();
  const [showFlyout, setShowFlyout] = useState(false);
  const [adJobIds, setAdJobIds] = useState<string[]>([]);
  const [dfaJobIds, setDfaJobIds] = useState<string[]>([]);
  const [selectedJobIds, setSelectedJobIds] = useState<string[]>([]);
  const [exporting, setExporting] = useState(false);
  const [selectedJobType, setSelectedJobType] = useState<JobType>('anomaly-detector');

  useEffect(() => {
    setAdJobIds([]);
    setSelectedJobIds([]);
    setExporting(false);

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

  function toggleSelectedJob(e: any, id: string) {
    if (e.target.checked) {
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
    if (selectedJobIds.length === adJobIds.length) {
      setSelectedJobIds([]);
    } else {
      setSelectedJobIds([...adJobIds]);
    }
  }

  return (
    <Fragment>
      <FlyoutButton onClick={toggleFlyout} isDisabled={isDisabled} />

      {showFlyout === true && isDisabled === false && (
        <EuiFlyout onClose={() => setShowFlyout(false)} hideCloseButton size="s">
          <EuiFlyoutHeader hasBorder>
            <EuiTitle size="m">
              <h2>
                <FormattedMessage
                  id="xpack.infra.ml.aomalyFlyout.jobSetup.flyoutHeader"
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
                  id="xpack.ml.newJob.wizard.datafeedPreviewFlyout.closeButton"
                  defaultMessage="Anomaly detection"
                />
              </EuiTab>
              <EuiTab
                isSelected={selectedJobType === 'data-frame-analytics'}
                onClick={() => changeTab('data-frame-analytics')}
                disabled={exporting}
              >
                <FormattedMessage
                  id="xpack.ml.newJob.wizard.datafeedPreviewFlyout.closeButton"
                  defaultMessage="Analytics"
                />
              </EuiTab>
            </EuiTabs>
            <EuiSpacer size="s" />
            <>
              {selectedJobType === 'anomaly-detector' && (
                <>
                  <EuiButtonEmpty
                    size="xs"
                    onClick={onSelectAll}
                    isDisabled={isDisabled}
                    data-test-subj="mlJobWizardButtonPreviewJobJson"
                  >
                    <FormattedMessage
                      id="xpack.ml.newJob.wizard.datafeedPreviewFlyout.showButton"
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
                        onChange={(e) => toggleSelectedJob(e, id)}
                      />
                      <EuiSpacer size="s" />
                    </div>
                  ))}
                </>
              )}
              {selectedJobType === 'data-frame-analytics' && (
                <>
                  <EuiButtonEmpty
                    size="xs"
                    onClick={onSelectAll}
                    isDisabled={isDisabled}
                    data-test-subj="mlJobWizardButtonPreviewJobJson"
                  >
                    <FormattedMessage
                      id="xpack.ml.newJob.wizard.datafeedPreviewFlyout.showButton"
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
                        onChange={(e) => toggleSelectedJob(e, id)}
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
                  disabled={selectedJobIds.length === 0 || exporting === true}
                  onClick={onExport}
                  fill
                >
                  <FormattedMessage
                    id="xpack.ml.newJob.wizard.revertModelSnapshotFlyout.saveButton"
                    defaultMessage="Export"
                  />
                </EuiButton>
              </EuiFlexItem>
            </EuiFlexGroup>
          </EuiFlyoutFooter>
        </EuiFlyout>
      )}
    </Fragment>
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
      <FormattedMessage
        id="xpack.ml.newJob.wizard.datafeedPreviewFlyout.showButton"
        defaultMessage="Export jobs"
      />
    </EuiButtonEmpty>
  );
};
