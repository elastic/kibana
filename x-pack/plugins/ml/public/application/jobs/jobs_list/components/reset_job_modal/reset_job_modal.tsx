/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { FC, useState, useEffect } from 'react';
import { FormattedMessage } from '@kbn/i18n/react';
import {
  EuiSpacer,
  EuiModal,
  EuiModalHeader,
  EuiModalHeaderTitle,
  EuiModalBody,
  EuiModalFooter,
  EuiButtonEmpty,
  EuiButton,
  EuiLoadingSpinner,
  EuiText,
} from '@elastic/eui';

import { resetJobs } from '../utils';
import { RESETTING_JOBS_REFRESH_INTERVAL_MS } from '../../../../../../common/constants/jobs_list';

type ShowFunc = (jobs: Array<{ id: string }>) => void;

interface Props {
  setShowFunction(showFunc: ShowFunc): void;
  unsetShowFunction(): void;
  refreshJobs(): void;
}

export const ResetJobModal: FC<Props> = ({ setShowFunction, unsetShowFunction, refreshJobs }) => {
  const [resetting, setResetting] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [jobIds, setJobIds] = useState<string[]>([]);

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

  function showModal(jobs: any[]) {
    setJobIds(jobs.map(({ id }) => id));
    setModalVisible(true);
    setResetting(false);
  }

  function closeModal() {
    setModalVisible(false);
  }

  function resetJob() {
    setResetting(true);
    resetJobs(jobIds);

    setTimeout(() => {
      closeModal();
      refreshJobs();
    }, RESETTING_JOBS_REFRESH_INTERVAL_MS);
  }

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
        <p>
          {resetting === true ? (
            <div>
              <FormattedMessage
                id="xpack.ml.jobsList.resetJobModal.resettingJobsStatusLabel"
                defaultMessage="Resetting {jobsCount, plural, one {{jobId}} other {# jobs}}"
                values={{
                  jobsCount: jobIds.length,
                  jobId: jobIds[0],
                }}
              />
              <EuiSpacer />
              <div style={{ textAlign: 'center' }}>
                <EuiLoadingSpinner size="l" />
              </div>
            </div>
          ) : (
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
          )}
        </p>
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
