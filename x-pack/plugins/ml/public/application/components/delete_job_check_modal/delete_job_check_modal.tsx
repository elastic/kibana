/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { FC, useState, useEffect } from 'react';
import { FormattedMessage } from '@kbn/i18n/react';
import { i18n } from '@kbn/i18n';
import {
  EuiButtonEmpty,
  EuiFlexGroup,
  EuiFlexItem,
  EuiModal,
  EuiOverlayMask,
  EuiModalHeader,
  EuiModalHeaderTitle,
  EuiModalBody,
  EuiModalFooter,
  EuiButton,
  // EuiLoadingSpinner, // TODO: loading spinner as modal content when waiting for check
} from '@elastic/eui';
import { JobType, CanDeleteJobResponse } from '../../../../common/types/saved_objects';
import { useMlApiContext } from '../../contexts/kibana';
import { useToastNotificationService } from '../../services/toast_notification_service';

const shouldUnTagLabel = i18n.translate('xpack.ml.deleteJobCheckModal.shouldUnTagLabel', {
  defaultMessage: 'Remove job from current space',
});

interface ModalContentReturnType {
  buttonText: JSX.Element;
  modalText: JSX.Element;
}

interface JobCheckRespSummary {
  canDelete: boolean;
  canUntag: boolean;
  canTakeAnyAction: boolean;
}

function getRespSummary(resp: CanDeleteJobResponse): JobCheckRespSummary {
  const jobsChecked = Object.keys(resp);
  // Default to first job's permisions
  const canDelete = resp[jobsChecked[0]].canDelete;
  const canUntag = resp[jobsChecked[0]].canUntag;
  let canTakeAnyAction: boolean;

  if (jobsChecked.length > 1) {
    // Check all jobs and make sure they have the same permissions - otherwise no action can be taken
    canTakeAnyAction = jobsChecked.every(
      (id) => resp[id].canDelete === canDelete && resp[id].canUntag === canUntag
    );
  } else {
    canTakeAnyAction = true;
  }

  return { canDelete, canUntag, canTakeAnyAction };
}

function getModalContent(
  jobIds: string[],
  respSummary: JobCheckRespSummary
): ModalContentReturnType {
  const { canDelete, canUntag, canTakeAnyAction } = respSummary;

  if (canTakeAnyAction === false) {
    return {
      buttonText: (
        <FormattedMessage
          id="xpack.ml.deleteJobCheckModal.buttonTextNoAction"
          defaultMessage="Close"
        />
      ),
      modalText: (
        <FormattedMessage
          id="xpack.ml.deleteJobCheckModal.modalTextNoAction"
          defaultMessage="{ids} have different permissions. Jobs must have matching permissions in order to continue delete action."
          values={{ ids: jobIds.join(', ') }}
        />
      ),
    };
  }

  const noActionContent: ModalContentReturnType = {
    buttonText: (
      <FormattedMessage id="xpack.ml.deleteJobCheckModal.buttonTextClose" defaultMessage="Close" />
    ),
    modalText: (
      <FormattedMessage
        id="xpack.ml.deleteJobCheckModal.modalTextClose"
        defaultMessage="{ids} cannot be deleted and cannot be removed from current space."
        values={{ ids: jobIds.join(', ') }}
      />
    ),
  };

  if (canDelete && canUntag) {
    return {
      buttonText: (
        <FormattedMessage
          id="xpack.ml.deleteJobCheckModal.buttonTextCanDelete"
          defaultMessage="Continue to delete {length, plural, one {# job} other {# jobs}}"
          values={{ length: jobIds.length }}
        />
      ),
      modalText: (
        <FormattedMessage
          id="xpack.ml.deleteJobCheckModal.modalTextCanDelete"
          defaultMessage="{ids} can be deleted."
          values={{ ids: jobIds.join(', ') }}
        />
      ),
    };
  } else if (!canDelete && canUntag) {
    return {
      buttonText: (
        <FormattedMessage
          id="xpack.ml.deleteJobCheckModal.buttonTextCanUnTagConfirm"
          defaultMessage="Remove from current space"
        />
      ),
      modalText: (
        <FormattedMessage
          id="xpack.ml.deleteJobCheckModal.modalTextCanUnTag"
          defaultMessage="{ids} cannot be deleted but can be removed from the current space."
          values={{ ids: jobIds.join(', ') }}
        />
      ),
    };
  } else if (!canDelete && !canUntag) {
    return noActionContent;
  }

  return noActionContent;
}

interface Props {
  canDeleteCallback: () => void;
  onCloseCallback: () => void;
  refreshJobsCallback?: () => void;
  jobType: JobType;
  jobIds: string[];
}

export const DeleteJobCheckModal: FC<Props> = ({
  canDeleteCallback,
  onCloseCallback,
  refreshJobsCallback,
  jobType,
  jobIds,
}) => {
  const [buttonContent, setButtonContent] = useState<JSX.Element | undefined>();
  const [modalContent, setModalContent] = useState<JSX.Element | undefined>();
  const [hasUntagged, setHasUntagged] = useState<boolean>(false);
  const [isUntagging, setIsUntagging] = useState<boolean>(false);
  const [jobCheckRespSummary, setJobCheckRespSummary] = useState<JobCheckRespSummary | undefined>();

  const {
    savedObjects: { canDeleteJob, removeJobFromCurrentSpace },
  } = useMlApiContext();
  const { displayErrorToast, displaySuccessToast } = useToastNotificationService();

  useEffect(() => {
    // Do the spaces check and set the content for the modal and buttons depending on results
    canDeleteJob(jobType, jobIds).then((resp) => {
      const respSummary = getRespSummary(resp);
      setJobCheckRespSummary(respSummary);
      const { buttonText, modalText } = getModalContent(jobIds, respSummary);
      setButtonContent(buttonText);
      setModalContent(modalText);
    });
  }, []);

  const onUntagClick = async () => {
    setIsUntagging(true);
    const resp = await removeJobFromCurrentSpace(jobType, jobIds);
    setIsUntagging(false);
    Object.entries(resp).forEach(([id, { success, error }]) => {
      if (success === false) {
        const title = i18n.translate('xpack.ml.deleteJobCheckModal.unTagErrorTitle', {
          defaultMessage: 'Error updating {id}',
          values: { id },
        });
        displayErrorToast(error, title);
      } else {
        setHasUntagged(true);
        const message = i18n.translate('xpack.ml.deleteJobCheckModal.unTagSuccessTitle', {
          defaultMessage: 'Successfully updated {id}',
          values: { id },
        });
        displaySuccessToast(message);
      }
    });
    // Close the modal
    onCloseCallback();
    if (typeof refreshJobsCallback === 'function') {
      refreshJobsCallback();
    }
  };

  const onClick = async () => {
    if (jobCheckRespSummary?.canTakeAnyAction && jobCheckRespSummary?.canDelete) {
      canDeleteCallback();
    } else {
      onCloseCallback();
    }
  };

  return (
    <EuiOverlayMask data-test-subj="mlAnalyticsJobDeleteCheckOverlay">
      <EuiModal onClose={onCloseCallback}>
        <EuiModalHeader>
          <EuiModalHeaderTitle>
            <FormattedMessage
              id="xpack.ml.deleteJobCheckModal.modalTitle"
              defaultMessage="Checking spaces permissions"
            />
          </EuiModalHeaderTitle>
        </EuiModalHeader>

        <EuiModalBody>{modalContent}</EuiModalBody>

        <EuiModalFooter>
          <EuiFlexGroup justifyContent="spaceBetween">
            <EuiFlexItem grow={false}>
              {!hasUntagged &&
                jobCheckRespSummary?.canTakeAnyAction &&
                jobCheckRespSummary?.canUntag &&
                jobCheckRespSummary?.canDelete && (
                  <EuiButtonEmpty
                    isLoading={isUntagging}
                    color="primary"
                    size="s"
                    onClick={onUntagClick}
                  >
                    {shouldUnTagLabel}
                  </EuiButtonEmpty>
                )}
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <EuiButton
                size="s"
                onClick={
                  jobCheckRespSummary?.canUntag && !jobCheckRespSummary?.canDelete
                    ? onUntagClick
                    : onClick
                }
                fill
              >
                {buttonContent}
              </EuiButton>
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiModalFooter>
      </EuiModal>
    </EuiOverlayMask>
  );
};
