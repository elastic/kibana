/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FC } from 'react';
import React, { useState, useEffect, useCallback, useMemo } from 'react';
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
  EuiSwitch,
} from '@elastic/eui';

import { i18n } from '@kbn/i18n';
import { deleteJobs } from '../utils';
import { BLOCKED_JOBS_REFRESH_INTERVAL_MS } from '../../../../../../common/constants/jobs_list';
import { DeleteSpaceAwareItemCheckModal } from '../../../../components/delete_space_aware_item_check_modal';
import type { MlSummaryJob } from '../../../../../../common/types/anomaly_detection_jobs';
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
  const [adJobs, setAdJobs] = useState<MlSummaryJob[]>([]);
  const [canDelete, setCanDelete] = useState(false);
  const [deleteUserAnnotations, setDeleteUserAnnotations] = useState(false);
  const [deleteAlertingRules, setDeleteAlertingRules] = useState(false);

  useEffect(() => {
    if (typeof setShowFunction === 'function') {
      setShowFunction(showModal);
    }
    return () => {
      if (typeof unsetShowFunction === 'function') {
        unsetShowFunction();
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const showModal = useCallback((jobs: MlSummaryJob[]) => {
    setAdJobs(jobs);
    setModalVisible(true);
    setDeleting(false);
    setDeleteUserAnnotations(false);
  }, []);

  const { jobIds, hasManagedJob, hasAlertingRules } = useMemo(() => {
    return {
      jobIds: adJobs.map(({ id }) => id),
      hasManagedJob: adJobs.some((job) => isManagedJob(job)),
      hasAlertingRules: adJobs.some(
        (job) => Array.isArray(job.alertingRules) && job.alertingRules.length > 0
      ),
    };
  }, [adJobs]);

  const closeModal = useCallback(() => {
    setModalVisible(false);
    setCanDelete(false);
  }, []);

  const deleteJob = useCallback(() => {
    setDeleting(true);
    deleteJobs(
      jobIds.map((id) => ({ id })),
      deleteUserAnnotations,
      deleteAlertingRules
    );

    setTimeout(() => {
      closeModal();
      refreshJobs();
    }, BLOCKED_JOBS_REFRESH_INTERVAL_MS);
  }, [jobIds, deleteUserAnnotations, deleteAlertingRules, closeModal, refreshJobs]);

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
                  <EuiSpacer />
                  <EuiSwitch
                    label={i18n.translate(
                      'xpack.ml.jobsList.deleteJobModal.deleteUserAnnotations',
                      {
                        defaultMessage: 'Delete annotations',
                      }
                    )}
                    checked={deleteUserAnnotations}
                    onChange={(e) => setDeleteUserAnnotations(e.target.checked)}
                    data-test-subj="mlDeleteJobConfirmModalDeleteAnnotationsSwitch"
                  />
                  {hasAlertingRules ? (
                    <>
                      <EuiSpacer size={'s'} />
                      <EuiSwitch
                        label={i18n.translate(
                          'xpack.ml.jobsList.resetJobModal.deleteAlertingRules',
                          {
                            defaultMessage: 'Delete alerting rules',
                          }
                        )}
                        checked={deleteAlertingRules}
                        onChange={(e) => setDeleteAlertingRules(e.target.checked)}
                      />
                    </>
                  ) : null}
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
