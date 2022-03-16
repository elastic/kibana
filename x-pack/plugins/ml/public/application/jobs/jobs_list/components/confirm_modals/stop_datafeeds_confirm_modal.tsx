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
import { stopDatafeeds } from '../utils';
import { ManagedJobsWarningCallout } from './managed_jobs_warning_callout';

type ShowFunc = (jobs: MlSummaryJob[]) => void;

interface Props {
  setShowFunction(showFunc: ShowFunc): void;
  unsetShowFunction(): void;
  refreshJobs(): void;
  showStopDatafeedsFlyout(job: MlSummaryJob[]): void;
}

export const StopDatafeedsConfirmModal: FC<Props> = ({
  setShowFunction,
  unsetShowFunction,
  refreshJobs,
}) => {
  const [modalVisible, setModalVisible] = useState(false);
  const [hasManagedJob, setHasManaged] = useState(true);
  const [jobsToStop, setJobsToStop] = useState<MlSummaryJob[]>([]);

  const jobIds = useMemo(() => jobsToStop.map(({ id }) => id), [jobsToStop]);

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
    setJobsToStop(jobs);

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
        id="xpack.ml.jobsList.stopDatafeedsModal.stopDatafeedsTitle"
        defaultMessage="Stop datafeed for {jobsCount, plural, one {{jobId}} other {# jobs}}?"
        values={{
          jobsCount: jobIds.length,
          jobId: jobIds[0],
        }}
      />
    );

    return (
      <EuiModal data-test-subj="mlStopDatafeedsConfirmModal" onClose={closeModal}>
        <EuiModalHeader>
          <EuiModalHeaderTitle>{title}</EuiModalHeaderTitle>
        </EuiModalHeader>
        <EuiModalBody>
          <ManagedJobsWarningCallout
            jobsCount={jobIds.length}
            action={i18n.translate(
              'xpack.ml.jobsList.stopDatafeedsModal.stopManagedDatafeedsDescription',
              {
                defaultMessage: 'stopping',
              }
            )}
          />
        </EuiModalBody>
        <>
          <EuiSpacer />
          <EuiModalFooter>
            <EuiButtonEmpty onClick={closeModal}>
              <FormattedMessage
                id="xpack.ml.jobsList.stopDatafeedsConfirmModal.cancelButtonLabel"
                defaultMessage="Cancel"
              />
            </EuiButtonEmpty>

            <EuiButton
              onClick={() => {
                stopDatafeeds(jobsToStop, refreshJobs);
                closeModal();
              }}
              fill
              color="danger"
              data-test-subj="mlStopDatafeedsConfirmModalButton"
            >
              <FormattedMessage
                id="xpack.ml.jobsList.stopDatafeedsConfirmModal.stopButtonLabel"
                defaultMessage="Stop {jobsCount, plural, one {datafeed} other {datafeeds}}"
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
