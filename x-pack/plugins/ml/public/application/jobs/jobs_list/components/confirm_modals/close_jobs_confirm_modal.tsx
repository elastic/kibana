/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { FC, useState, useEffect, useCallback, useMemo } from 'react';
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
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { MlSummaryJob } from '../../../../../../common/types/anomaly_detection_jobs';
import { isManagedJob } from '../../../jobs_utils';
import { closeJobs } from '../utils';
import { ManagedJobsWarningCallout } from './managed_jobs_warning_callout';

type ShowFunc = (jobs: MlSummaryJob[]) => void;

interface Props {
  setShowFunction(showFunc: ShowFunc): void;
  unsetShowFunction(): void;
  refreshJobs(): void;
}

export const CloseJobsConfirmModal: FC<Props> = ({
  setShowFunction,
  unsetShowFunction,
  refreshJobs,
}) => {
  const [modalVisible, setModalVisible] = useState(false);
  const [hasManagedJob, setHasManaged] = useState(true);
  const [jobsToReset, setJobsToReset] = useState<MlSummaryJob[]>([]);

  const jobIds = useMemo(() => jobsToReset.map(({ id }) => id), [jobsToReset]);

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
    setJobsToReset(jobs);

    if (jobs.some((j) => isManagedJob(j))) {
      setModalVisible(true);
      setHasManaged(true);
    }
  }, []);

  const closeModal = useCallback(() => {
    setModalVisible(false);
    setHasManaged(false);
  }, []);

  if (modalVisible === false) {
    return null;
  }

  if (hasManagedJob) {
    const title = (
      <FormattedMessage
        id="xpack.ml.jobsList.startDatafeedsModal.closeDatafeedsTitle"
        defaultMessage="Close {jobsCount, plural, one {{jobId}} other {# jobs}}?"
        values={{
          jobsCount: jobIds.length,
          jobId: jobIds[0],
        }}
      />
    );

    return (
      <EuiModal data-test-subj="mlCloseJobsConfirmModal" onClose={closeModal}>
        <EuiModalHeader>
          <EuiModalHeaderTitle>{title}</EuiModalHeaderTitle>
        </EuiModalHeader>
        <EuiModalBody>
          <ManagedJobsWarningCallout
            jobsCount={jobIds.length}
            action={i18n.translate(
              'xpack.ml.jobsList.closeJobsModal.closeManagedDatafeedsDescription',
              {
                defaultMessage: 'closing',
              }
            )}
          />
        </EuiModalBody>
        <>
          <EuiSpacer />
          <EuiModalFooter>
            <EuiButtonEmpty onClick={closeModal}>
              <FormattedMessage
                id="xpack.ml.jobsList.startDatafeedsConfirmModal.cancelButtonLabel"
                defaultMessage="Cancel"
              />
            </EuiButtonEmpty>

            <EuiButton
              onClick={() => {
                closeJobs(jobsToReset, refreshJobs);
                closeModal();
              }}
              fill
              color="danger"
              data-test-subj="mlCloseJobsConfirmModalButton"
            >
              <FormattedMessage
                id="xpack.ml.jobsList.startDatafeedsConfirmModal.closeButtonLabel"
                defaultMessage="Close {jobsCount, plural, one {job} other {jobs}}"
                values={{
                  jobsCount: jobIds.length,
                }}
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
