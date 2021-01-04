/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { FC, useState, useEffect } from 'react';
import { FormattedMessage } from '@kbn/i18n/react';
import {
  EuiSpacer,
  EuiModal,
  EuiOverlayMask,
  EuiModalHeader,
  EuiModalHeaderTitle,
  EuiModalBody,
  EuiModalFooter,
  EuiButtonEmpty,
  EuiButton,
  EuiLoadingSpinner,
  EuiText,
} from '@elastic/eui';

import { deleteJobs } from '../utils';
import { DELETING_JOBS_REFRESH_INTERVAL_MS } from '../../../../../../common/constants/jobs_list';
import { DeleteJobCheckModal } from '../../../../components/delete_job_check_modal';

type ShowFunc = (jobs: Array<{ id: string }>) => void;

interface Props {
  setShowFunction(showFunc: ShowFunc): void;
  unsetShowFunction(): void;
  refreshJobs(): void;
}

export const DeleteJobModal: FC<Props> = ({ setShowFunction, unsetShowFunction, refreshJobs }) => {
  const [deleting, setDeleting] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [jobIds, setJobIds] = useState<string[]>([]);
  const [canDelete, setCanDelete] = useState(false);

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
    setDeleting(false);
  }

  function closeModal() {
    setModalVisible(false);
    setCanDelete(false);
  }

  function deleteJob() {
    setDeleting(true);
    deleteJobs(jobIds.map((id) => ({ id })));

    setTimeout(() => {
      closeModal();
      refreshJobs();
    }, DELETING_JOBS_REFRESH_INTERVAL_MS);
  }

  if (modalVisible === false || jobIds.length === 0) {
    return null;
  }

  if (canDelete) {
    return (
      <EuiOverlayMask>
        <EuiModal data-test-subj="mlDeleteJobConfirmModal" onClose={closeModal}>
          <EuiModalHeader>
            <EuiModalHeaderTitle>
              <FormattedMessage
                id="xpack.ml.jobsList.deleteJobModal.deleteJobsTitle"
                defaultMessage="Delete {jobsCount, plural, one {{jobId}} other {# jobs}}?"
                values={{
                  jobsCount: jobIds.length,
                  jobId: jobIds[0],
                }}
              />
            </EuiModalHeaderTitle>
          </EuiModalHeader>
          <EuiModalBody>
            <p>
              {deleting === true ? (
                <div>
                  <FormattedMessage
                    id="xpack.ml.jobsList.deleteJobModal.deletingJobsStatusLabel"
                    defaultMessage="Deleting jobs"
                  />
                  <EuiSpacer />
                  <div style={{ textAlign: 'center' }}>
                    <EuiLoadingSpinner size="l" />
                  </div>
                </div>
              ) : (
                <EuiText>
                  <FormattedMessage
                    id="xpack.ml.jobsList.deleteJobModal.deleteMultipleJobsDescription"
                    defaultMessage="Deleting {jobsCount, plural, one {a job} other {multiple jobs}} can be time consuming.
                {jobsCount, plural, one {It} other {They}} will be deleted in the background
                and may not disappear from the jobs list instantly."
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
              <EuiButtonEmpty onClick={closeModal} disabled={deleting}>
                <FormattedMessage
                  id="xpack.ml.jobsList.deleteJobModal.cancelButtonLabel"
                  defaultMessage="Cancel"
                />
              </EuiButtonEmpty>

              <EuiButton
                onClick={deleteJob}
                fill
                disabled={deleting}
                color="danger"
                data-test-subj="mlDeleteJobConfirmModalButton"
              >
                <FormattedMessage
                  id="xpack.ml.jobsList.deleteJobModal.deleteButtonLabel"
                  defaultMessage="Delete"
                />
              </EuiButton>
            </EuiModalFooter>
          </>
        </EuiModal>
      </EuiOverlayMask>
    );
  } else {
    return (
      <>
        <DeleteJobCheckModal
          jobIds={jobIds}
          jobType="anomaly-detector"
          canDeleteCallback={() => {
            setCanDelete(true);
          }}
          onCloseCallback={closeModal}
          refreshJobsCallback={refreshJobs}
        />
      </>
    );
  }
};
