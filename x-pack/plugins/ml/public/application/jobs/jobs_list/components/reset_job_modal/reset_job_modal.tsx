/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { FC, useState, useEffect, useCallback } from 'react';
import { FormattedMessage } from '@kbn/i18n-react';
import {
  EuiSpacer,
  EuiModal,
  EuiModalHeader,
  EuiModalHeaderTitle,
  EuiModalBody,
  EuiModalFooter,
  EuiButtonEmpty,
  EuiButton,
  EuiText,
} from '@elastic/eui';

import { resetJobs } from '../utils';
import type { MlSummaryJob } from '../../../../../../common/types/anomaly_detection_jobs';
import { RESETTING_JOBS_REFRESH_INTERVAL_MS } from '../../../../../../common/constants/jobs_list';
import { OpenJobsWarningCallout } from './open_jobs_warning_callout';

type ShowFunc = (jobs: MlSummaryJob[]) => void;

interface Props {
  setShowFunction(showFunc: ShowFunc): void;
  unsetShowFunction(): void;
  refreshJobs(): void;
}

export const ResetJobModal: FC<Props> = ({ setShowFunction, unsetShowFunction, refreshJobs }) => {
  const [resetting, setResetting] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [jobIds, setJobIds] = useState<string[]>([]);
  const [jobs, setJobs] = useState<MlSummaryJob[]>([]);

  useEffect(() => {
    if (typeof setShowFunction === 'function') {
      setShowFunction(showModal);
    }
    return () => {
      if (typeof unsetShowFunction === 'function') {
        unsetShowFunction();
      }
    };
  }, []);

  const showModal = useCallback((tempJobs: MlSummaryJob[]) => {
    setJobIds(tempJobs.map(({ id }) => id));
    setJobs(tempJobs);
    setModalVisible(true);
    setResetting(false);
  }, []);

  const closeModal = useCallback(() => {
    setModalVisible(false);
  }, []);

  const resetJob = useCallback(async () => {
    setResetting(true);
    await resetJobs(jobIds);
    closeModal();
    setTimeout(() => {
      refreshJobs();
    }, RESETTING_JOBS_REFRESH_INTERVAL_MS);
  }, [jobIds, refreshJobs]);

  if (modalVisible === false || jobIds.length === 0) {
    return null;
  }

  return (
    <EuiModal data-test-subj="mlResetJobConfirmModal" onClose={closeModal}>
      <EuiModalHeader>
        <EuiModalHeaderTitle>
          <FormattedMessage
            id="xpack.ml.jobsList.resetJobModal.resetJobsTitle"
            defaultMessage="Reset {jobsCount, plural, one {{jobId}} other {# jobs}}?"
            values={{
              jobsCount: jobIds.length,
              jobId: jobIds[0],
            }}
          />
        </EuiModalHeaderTitle>
      </EuiModalHeader>
      <EuiModalBody>
        <>
          <OpenJobsWarningCallout jobs={jobs} />
          <EuiText>
            <FormattedMessage
              id="xpack.ml.jobsList.resetJobModal.resetMultipleJobsDescription"
              defaultMessage="Resetting {jobsCount, plural, one {a job} other {multiple jobs}} can be time consuming.
                {jobsCount, plural, one {It} other {They}} will be reset in the background
                and may not be updated in the jobs list instantly."
              values={{
                jobsCount: jobIds.length,
              }}
            />
          </EuiText>
        </>
      </EuiModalBody>
      <>
        <EuiSpacer />
        <EuiModalFooter>
          <EuiButtonEmpty onClick={closeModal} disabled={resetting}>
            <FormattedMessage
              id="xpack.ml.jobsList.resetJobModal.cancelButtonLabel"
              defaultMessage="Cancel"
            />
          </EuiButtonEmpty>

          <EuiButton
            onClick={resetJob}
            fill
            disabled={resetting}
            color="danger"
            data-test-subj="mlResetJobConfirmModalButton"
          >
            <FormattedMessage
              id="xpack.ml.jobsList.resetJobModal.resetButtonLabel"
              defaultMessage="Reset"
            />
          </EuiButton>
        </EuiModalFooter>
      </>
    </EuiModal>
  );
};
