/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { FC, useState } from 'react';
import { FormattedMessage } from '@kbn/i18n-react';
import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiHorizontalRule,
  EuiSpacer,
  EuiText,
  EuiTitle,
} from '@elastic/eui';
import { JobOverrides, ModuleJobUI, SAVE_STATE } from '../page';
import { JobItem } from './job_item';
import { EditJob } from './edit_job';
import { JobOverride } from '../../../../../../common/types/modules';

interface ModuleJobsProps {
  jobs: ModuleJobUI[];
  jobPrefix: string;
  saveState: SAVE_STATE;
  existingGroupIds: string[];
  jobOverrides: JobOverrides;
  onJobOverridesChange: (job: JobOverride) => void;
}

export const SETUP_RESULTS_WIDTH = '200px';

export const ModuleJobs: FC<ModuleJobsProps> = ({
  jobs,
  jobPrefix,
  jobOverrides,
  saveState,
  existingGroupIds,
  onJobOverridesChange,
}) => {
  const isSaving = saveState === SAVE_STATE.SAVING;

  const [jobToEdit, setJobToEdit] = useState<ModuleJobUI | null>(null);

  const onFlyoutClose = (result: JobOverride | null) => {
    setJobToEdit(null);

    if (result === null) {
      return;
    }

    onJobOverridesChange(result);
  };

  const getJobOverride = (job: ModuleJobUI): JobOverride | undefined => {
    return jobOverrides[job.id];
  };

  const editJobFlyout =
    jobToEdit !== null ? (
      <EditJob
        job={jobToEdit}
        jobOverride={getJobOverride(jobToEdit)}
        onClose={onFlyoutClose}
        existingGroupIds={existingGroupIds}
      />
    ) : null;

  return (
    <>
      <EuiTitle size="s">
        <h4>
          <FormattedMessage id="xpack.ml.newJob.recognize.jobsTitle" defaultMessage="Jobs" />
        </h4>
      </EuiTitle>

      <EuiSpacer size="s" />

      {saveState !== SAVE_STATE.SAVING && saveState !== SAVE_STATE.NOT_SAVED && (
        <EuiFlexGroup justifyContent="flexEnd" responsive={false} gutterSize="s">
          <EuiFlexItem style={{ width: SETUP_RESULTS_WIDTH }} grow={false}>
            <EuiFlexGroup justifyContent="spaceAround" responsive={false} gutterSize="s">
              <EuiFlexItem grow={1}>
                <EuiText size="s" textAlign="center">
                  <FormattedMessage id="xpack.ml.newJob.recognize.jobLabel" defaultMessage="Job" />
                </EuiText>
              </EuiFlexItem>
              <EuiFlexItem grow={1}>
                <EuiText size="s" textAlign="center">
                  <FormattedMessage
                    id="xpack.ml.newJob.recognize.datafeedLabel"
                    defaultMessage="Datafeed"
                  />
                </EuiText>
              </EuiFlexItem>
              <EuiFlexItem grow={1}>
                <EuiText size="s" textAlign="center">
                  <FormattedMessage
                    id="xpack.ml.newJob.recognize.runningLabel"
                    defaultMessage="Running"
                  />
                </EuiText>
              </EuiFlexItem>
            </EuiFlexGroup>
          </EuiFlexItem>
        </EuiFlexGroup>
      )}

      <ul>
        {jobs.map((job, i) => (
          <li key={job.id}>
            <EuiFlexGroup>
              <EuiFlexItem>
                <JobItem
                  jobPrefix={jobPrefix}
                  job={job}
                  jobOverride={getJobOverride(job)}
                  isSaving={isSaving}
                  onEditRequest={() => setJobToEdit(job)}
                />
              </EuiFlexItem>
            </EuiFlexGroup>

            {i < jobs.length - 1 && <EuiHorizontalRule margin="s" />}
          </li>
        ))}
      </ul>

      {editJobFlyout}
    </>
  );
};
