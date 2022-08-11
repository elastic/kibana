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
  EuiLoadingSpinner,
  EuiText,
} from '@elastic/eui';

import { i18n } from '@kbn/i18n';
import { deleteJobs } from '../utils';
import { DELETING_JOBS_REFRESH_INTERVAL_MS } from '../../../../../../common/constants/jobs_list';
import { DeleteSpaceAwareItemCheckModal } from '../../../../components/delete_space_aware_item_check_modal';
import { MlSummaryJob } from '../../../../../../common/types/anomaly_detection_jobs';
import { isManagedJob } from '../../../jobs_utils';
import { ManagedJobsWarningCallout } from '../confirm_modals/managed_jobs_warning_callout';

type ShowFunc = (jobs: MlSummaryJob[]) => void;

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
  const [hasManagedJob, setHasManagedJob] = useState(false);

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

  const showModal = useCallback((jobs: MlSummaryJob[]) => {
    setJobIds(jobs.map(({ id }) => id));
    setHasManagedJob(jobs.some((job) => isManagedJob(job)));
    setModalVisible(true);
    setDeleting(false);
  }, []);

  const closeModal = useCallback(() => {
    setModalVisible(false);
    setCanDelete(false);
  }, []);

  const deleteJob = useCallback(() => {
    setDeleting(true);
    deleteJobs(jobIds.map((id) => ({ id })));

    setTimeout(() => {
      closeModal();
      refreshJobs();
    }, DELETING_JOBS_REFRESH_INTERVAL_MS);
  }, [jobIds, refreshJobs]);

  if (modalVisible === false || jobIds.length === 0) {
    return null;
  }

  if (canDelete) {
    return (
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
              <>
                {hasManagedJob ? (
                  <>
                    <ManagedJobsWarningCallout
                      jobsCount={jobIds.length}
                      action={i18n.translate('xpack.ml.jobsList.deleteJobModal.deleteAction', {
                        defaultMessage: 'deleting',
                      })}
                    />
                    <EuiSpacer />
                  </>
                ) : null}
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
              </>
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
    );
  } else {
    return (
      <>
        <DeleteSpaceAwareItemCheckModal
          ids={jobIds}
          mlSavedObjectType="anomaly-detector"
          canDeleteCallback={() => {
            setCanDelete(true);
          }}
          onCloseCallback={closeModal}
          refreshJobsCallback={refreshJobs}
          hasManagedJob={hasManagedJob}
        />
      </>
    );
  }
};
