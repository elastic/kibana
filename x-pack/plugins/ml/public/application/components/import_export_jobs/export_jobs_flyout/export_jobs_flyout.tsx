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
import { exportJobs } from '../utils';

interface Props {
  isDisabled: boolean;
}
export const ExportJobsFlyout: FC<Props> = ({ isDisabled }) => {
  const { getJobs } = useMlApiContext();
  const [showFlyout, setShowFlyout] = useState(false);
  const [jobIds, setJobIds] = useState<string[]>([]);
  const [selectedJobIds, setSelectedJobIds] = useState<string[]>([]);
  const [exporting, setExporting] = useState(false);
  const [selectedTab, setSelectedTab] = useState(0);

  useEffect(() => {
    setJobIds([]);
    setSelectedJobIds([]);
    setExporting(false);

    if (showFlyout) {
      getJobs().then(({ jobs }) => {
        setJobIds(jobs.map((j) => j.job_id));
      });
    }
  }, [showFlyout]);

  function toggleFlyout() {
    setShowFlyout(!showFlyout);
  }

  async function onExport() {
    setExporting(true);
    await exportJobs(selectedJobIds);
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

  function changeTab(tab: number) {
    setSelectedJobIds([]);
    setSelectedTab(tab);
  }

  function onSelectAll() {
    if (selectedJobIds.length === jobIds.length) {
      setSelectedJobIds([]);
    } else {
      setSelectedJobIds([...jobIds]);
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
                isSelected={selectedTab === 0}
                onClick={() => changeTab(0)}
                disabled={exporting}
              >
                <FormattedMessage
                  id="xpack.ml.newJob.wizard.datafeedPreviewFlyout.closeButton"
                  defaultMessage="Anomaly detection"
                />
              </EuiTab>
              <EuiTab
                isSelected={selectedTab === 1}
                onClick={() => changeTab(1)}
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
              {selectedTab === 0 && (
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

                  {jobIds.map((id) => (
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
