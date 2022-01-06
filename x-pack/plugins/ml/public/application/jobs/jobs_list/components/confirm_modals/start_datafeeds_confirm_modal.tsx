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
  EuiText,
} from '@elastic/eui';
import { MlSummaryJob } from '../../../../../../common/types/anomaly_detection_jobs';
import { isManagedJob } from '../../../jobs_utils';
// @ts-ignore
import { startDatafeeds } from '../utils';

type ShowFunc = (jobs: MlSummaryJob[]) => void;

interface Props {
  setShowFunction(showFunc: ShowFunc): void;
  unsetShowFunction(): void;
  refreshJobs(): void;
  showStartDatafeedModal(job: MlSummaryJob[]): void;
}

export const StartDatafeedsConfirmModal: FC<Props> = ({
  setShowFunction,
  unsetShowFunction,
  refreshJobs,
  showStartDatafeedModal,
}) => {
  const [modalVisible, setModalVisible] = useState(false);
  const [isManaged, setHasManaged] = useState(true);
  const [jobsToStart, setJobsToStart] = useState<MlSummaryJob[]>([]);

  const jobIds = useMemo(() => jobsToStart.map(({ id }) => id), [jobsToStart]);

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
    setJobsToStart(jobs);

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

  if (isManaged) {
    const title = (
      <FormattedMessage
        id="xpack.ml.jobsList.startDatafeedsModal.startDatafeedsTitle"
        defaultMessage="Start datafeed for {jobsCount, plural, one {{jobId}} other {# jobs}}?"
        values={{
          jobsCount: jobIds.length,
          jobId: jobIds[0],
        }}
      />
    );

    return (
      <EuiModal data-test-subj="mlStartDatafeedsConfirmModal" onClose={closeModal}>
        <EuiModalHeader>
          <EuiModalHeaderTitle>{title}</EuiModalHeaderTitle>
        </EuiModalHeader>
        <EuiModalBody>
          <p>
            <>
              <EuiText>
                <FormattedMessage
                  id="xpack.ml.jobsList.startDatafeedsModal.startManagedDatafeedsDescription"
                  defaultMessage="{jobsCount, plural, one {This preconfigured job} other {At least one of these jobs}} is provided by Elastic; starting {jobsCount, plural, one {it} other {them}} might impact other parts of the product."
                  values={{
                    jobsCount: jobIds.length,
                  }}
                />
              </EuiText>
            </>
          </p>
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
                showStartDatafeedModal(jobsToStart);
                closeModal();
              }}
              fill
              color="danger"
              data-test-subj="mlStartDatafeedsConfirmModalButton"
            >
              <FormattedMessage
                id="xpack.ml.jobsList.startDatafeedsConfirmModal.startButtonLabel"
                defaultMessage="Start {jobsCount, plural, one {datafeed} other {datafeeds}}"
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
