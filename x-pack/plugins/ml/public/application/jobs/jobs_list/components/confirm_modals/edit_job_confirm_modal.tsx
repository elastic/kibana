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
import { MlSummaryJob } from '../../../../../../common/types/anomaly_detection_jobs';
import { isManagedJob } from '../../../jobs_utils';

type ShowFunc = (jobs: MlSummaryJob) => void;

interface Props {
  setShowFunction(showFunc: ShowFunc): void;
  unsetShowFunction(): void;
  refreshJobs(): void;
  showEditJobFlyout(job: MlSummaryJob): void;
}

export const EditJobConfirmModal: FC<Props> = ({
  setShowFunction,
  unsetShowFunction,
  showEditJobFlyout,
}) => {
  const [editing, setEditing] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [isManaged, setIsManaged] = useState(true);
  const [job, setJob] = useState<MlSummaryJob>();

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

  const showModal = useCallback((item: MlSummaryJob) => {
    if (isManagedJob(item)) {
      setModalVisible(true);
      setEditing(false);
      setIsManaged(true);
      setJob(item);
    }
  }, []);

  const closeModal = useCallback(() => {
    setModalVisible(false);
    setIsManaged(false);
  }, []);

  if (modalVisible === false) {
    return null;
  }

  if (isManaged) {
    const title = (
      <FormattedMessage
        id="xpack.ml.jobsList.editJobModal.editJobsTitle"
        defaultMessage="Edit {jobId}?"
        values={{
          jobId: job?.id,
        }}
      />
    );

    return (
      <EuiModal data-test-subj="mlEditJobConfirmConfirmModal" onClose={closeModal}>
        <EuiModalHeader>
          <EuiModalHeaderTitle>{title}</EuiModalHeaderTitle>
        </EuiModalHeader>
        <EuiModalBody>
          <p>
            <>
              <EuiText>
                <FormattedMessage
                  id="xpack.ml.jobsList.editJobModal.editManagedJobDescription"
                  defaultMessage="This preconfigured job is provided by Elastic; editing it may impact other parts of the product."
                />
              </EuiText>
            </>
          </p>
        </EuiModalBody>
        <>
          <EuiSpacer />
          <EuiModalFooter>
            <EuiButtonEmpty onClick={closeModal} disabled={editing}>
              <FormattedMessage
                id="xpack.ml.jobsList.editJobModal.cancelButtonLabel"
                defaultMessage="Cancel"
              />
            </EuiButtonEmpty>

            <EuiButton
              onClick={() => {
                if (job) {
                  showEditJobFlyout(job);
                }
                closeModal();
              }}
              fill
              disabled={editing}
              color="danger"
              data-test-subj="mlEditJobConfirmConfirmModalButton"
            >
              <FormattedMessage
                id="xpack.ml.jobsList.editJobModal.editButtonLabel"
                defaultMessage="Edit"
              />
            </EuiButton>
          </EuiModalFooter>
        </>
      </EuiModal>
    );
  } else {
    return <></>;
  }
};
