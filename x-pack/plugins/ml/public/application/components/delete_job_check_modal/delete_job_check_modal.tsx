/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { FC, useState, useEffect } from 'react';
import { FormattedMessage } from '@kbn/i18n/react';
import { i18n } from '@kbn/i18n';
import {
  EuiButtonEmpty,
  EuiFlexGroup,
  EuiFlexItem,
  EuiModal,
  EuiModalHeader,
  EuiModalHeaderTitle,
  EuiModalBody,
  EuiModalFooter,
  EuiButton,
  EuiLoadingSpinner,
  EuiText,
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
  canRemoveFromSpace: boolean;
  canTakeAnyAction: boolean;
}

function getRespSummary(resp: CanDeleteJobResponse): JobCheckRespSummary {
  const jobsChecked = Object.keys(resp);
  // Default to first job's permissions
  const { canDelete, canRemoveFromSpace } = resp[jobsChecked[0]];
  let canTakeAnyAction = true;

  if (jobsChecked.length > 1) {
    // Check all jobs and make sure they have the same permissions - otherwise no action can be taken
    canTakeAnyAction = jobsChecked.every(
      (id) => resp[id].canDelete === canDelete && resp[id].canRemoveFromSpace === canRemoveFromSpace
    );
  }

  return { canDelete, canRemoveFromSpace, canTakeAnyAction };
}

function getModalContent(
  jobIds: string[],
  respSummary: JobCheckRespSummary
): ModalContentReturnType {
  const { canDelete, canRemoveFromSpace, canTakeAnyAction } = respSummary;

  if (canTakeAnyAction === false) {
    return {
      buttonText: (
        <FormattedMessage
          id="xpack.ml.deleteJobCheckModal.buttonTextNoAction"
          defaultMessage="Close"
        />
      ),
      modalText: (
        <EuiText>
          <FormattedMessage
            id="xpack.ml.deleteJobCheckModal.modalTextNoAction"
            defaultMessage="{ids} have different space permissions. When you delete multiple jobs, they must have the same permissions. Deselect the jobs and try deleting each job individually."
            values={{ ids: jobIds.join(', ') }}
          />
        </EuiText>
      ),
    };
  }

  const noActionContent: ModalContentReturnType = {
    buttonText: (
      <FormattedMessage id="xpack.ml.deleteJobCheckModal.buttonTextClose" defaultMessage="Close" />
    ),
    modalText: (
      <EuiText>
        <FormattedMessage
          id="xpack.ml.deleteJobCheckModal.modalTextClose"
          defaultMessage="{ids} cannot be deleted and cannot be removed from the current space. This job is assigned to the * space and you do not have access to all spaces."
          values={{ ids: jobIds.join(', ') }}
        />
      </EuiText>
    ),
  };

  if (canDelete) {
    return {
      buttonText: (
        <FormattedMessage
          id="xpack.ml.deleteJobCheckModal.buttonTextCanDelete"
          defaultMessage="Continue to delete {length, plural, one {# job} other {# jobs}}"
          values={{ length: jobIds.length }}
        />
      ),
      modalText: (
        <EuiText>
          <FormattedMessage
            id="xpack.ml.deleteJobCheckModal.modalTextCanDelete"
            defaultMessage="{ids} can be deleted."
            values={{ ids: jobIds.join(', ') }}
          />
        </EuiText>
      ),
    };
  } else if (canRemoveFromSpace) {
    return {
      buttonText: (
        <FormattedMessage
          id="xpack.ml.deleteJobCheckModal.buttonTextCanUnTagConfirm"
          defaultMessage="Remove from current space"
        />
      ),
      modalText: (
        <EuiText>
          <FormattedMessage
            id="xpack.ml.deleteJobCheckModal.modalTextCanUnTag"
            defaultMessage="{ids} cannot be deleted but can be removed from the current space."
            values={{ ids: jobIds.join(', ') }}
          />
        </EuiText>
      ),
    };
  } else {
    return noActionContent;
  }
}

interface Props {
  canDeleteCallback: () => void;
  onCloseCallback: () => void;
  refreshJobsCallback?: () => void;
  jobType: JobType;
  jobIds: string[];
  setDidUntag?: React.Dispatch<React.SetStateAction<boolean>>;
}

export const DeleteJobCheckModal: FC<Props> = ({
  canDeleteCallback,
  onCloseCallback,
  refreshJobsCallback,
  jobType,
  jobIds,
  setDidUntag,
}) => {
  const [buttonContent, setButtonContent] = useState<JSX.Element | undefined>();
  const [modalContent, setModalContent] = useState<JSX.Element | undefined>();
  const [hasUntagged, setHasUntagged] = useState<boolean>(false);
  const [isUntagging, setIsUntagging] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [jobCheckRespSummary, setJobCheckRespSummary] = useState<JobCheckRespSummary | undefined>();

  const {
    savedObjects: { canDeleteJob, removeJobFromCurrentSpace },
  } = useMlApiContext();
  const { displayErrorToast, displaySuccessToast } = useToastNotificationService();

  useEffect(() => {
    setIsLoading(true);
    // Do the spaces check and set the content for the modal and buttons depending on results
    canDeleteJob(jobType, jobIds).then((resp) => {
      const respSummary = getRespSummary(resp);
      const { canDelete, canRemoveFromSpace, canTakeAnyAction } = respSummary;
      if (canTakeAnyAction && canDelete && !canRemoveFromSpace) {
        // Go straight to delete flow if that's the only action available
        canDeleteCallback();
        return;
      }
      setJobCheckRespSummary(respSummary);
      const { buttonText, modalText } = getModalContent(jobIds, respSummary);
      setButtonContent(buttonText);
      setModalContent(modalText);
    });
    if (typeof setDidUntag === 'function') {
      setDidUntag(false);
    }
    setIsLoading(false);
  }, []);

  const onUntagClick = async () => {
    setIsUntagging(true);
    const resp = await removeJobFromCurrentSpace(jobType, jobIds);
    setIsUntagging(false);
    if (typeof setDidUntag === 'function') {
      setDidUntag(true);
    }
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
    <EuiModal onClose={onCloseCallback} data-test-subj="mlAnalyticsJobDeleteCheckOverlay">
      {isLoading === true && (
        <>
          <EuiModalBody>
            <EuiFlexGroup justifyContent="spaceAround">
              <EuiFlexItem grow={false}>
                <EuiLoadingSpinner size="xl" />
              </EuiFlexItem>
            </EuiFlexGroup>
          </EuiModalBody>
        </>
      )}
      {isLoading === false && (
        <>
          <EuiModalHeader>
            <EuiModalHeaderTitle>
              <FormattedMessage
                id="xpack.ml.deleteJobCheckModal.modalTitle"
                defaultMessage="Checking space permissions"
              />
            </EuiModalHeaderTitle>
          </EuiModalHeader>

          <EuiModalBody>{modalContent}</EuiModalBody>

          <EuiModalFooter>
            <EuiFlexGroup justifyContent="spaceBetween">
              <EuiFlexItem grow={false}>
                {!hasUntagged &&
                  jobCheckRespSummary?.canTakeAnyAction &&
                  jobCheckRespSummary?.canRemoveFromSpace &&
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
                    jobCheckRespSummary?.canTakeAnyAction &&
                    jobCheckRespSummary?.canRemoveFromSpace &&
                    !jobCheckRespSummary?.canDelete
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
        </>
      )}
    </EuiModal>
  );
};
