/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { Fragment, FC, useState, useEffect } from 'react';
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
  EuiFieldText,
  EuiSpacer,
} from '@elastic/eui';

import { Job, Datafeed } from '../../../../../common/types/anomaly_detection_jobs';
import { useMlApiContext } from '../../../contexts/kibana';

interface ImportedJob {
  job: Job;
  datafeed: Datafeed;
}

interface Props {
  isDisabled: boolean;
  refreshJobs(): void;
}
export const ImportJobsFlyout: FC<Props> = ({ isDisabled, refreshJobs }) => {
  const {
    jobs: { bulkCreateJobs },
  } = useMlApiContext();
  const [showFlyout, setShowFlyout] = useState(false);
  const [jobs, setJobs] = useState<ImportedJob[]>([]);
  const [jobIds, setJobIds] = useState<string[]>([]);
  const [importing, setImporting] = useState(false);

  useEffect(() => {
    setJobs([]);
    setJobIds([]);
    setImporting(false);
  }, [showFlyout]);

  function toggleFlyout() {
    setShowFlyout(!showFlyout);
  }

  async function onFilePickerChange(files: any) {
    if (files.length) {
      try {
        const json = await readFile(files[0]);
        const readJobs = Array.isArray(json) ? json : [json];
        setJobs(readJobs);
        setJobIds(readJobs.map((j) => j.job.job_id));
      } catch (error) {
        // show error
      }
    } else {
      setJobs([]);
      setJobIds([]);
    }
  }

  async function onImport() {
    setImporting(true);
    const renamedJobs = renameJobs(jobIds, jobs);
    await bulkCreateJobs(renamedJobs);
    setImporting(false);
    setShowFlyout(false);
    refreshJobs();
  }

  function renameJob(index: number, e: any) {
    const js = [...jobIds];
    js[index] = e.target.value;
    setJobIds(js);
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

              {jobs.length > 0 && (
                <>
                  <EuiSpacer size="l" />
                  <FormattedMessage
                    id="xpack.infra.ml.aomalyFlyout.jobSetup.flyoutHeader"
                    defaultMessage="{num} jobs read from file"
                    values={{ num: jobs.length }}
                  />
                  <EuiSpacer size="l" />

                  {jobIds.map((j, i) => (
                    <div key={i}>
                      <EuiFieldText
                        disabled={importing}
                        compressed={true}
                        value={j}
                        onChange={(e) => renameJob(i, e)}
                        aria-label="Use aria labels when no actual label is in use"
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
                  disabled={jobs.length === 0 || importing === true}
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
    </Fragment>
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

function renameJobs(jobIds: string[], jobs: ImportedJob[]) {
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
