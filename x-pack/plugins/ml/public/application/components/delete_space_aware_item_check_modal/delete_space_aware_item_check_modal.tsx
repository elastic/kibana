/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { FC, useState, useEffect } from 'react';
import { FormattedMessage } from '@kbn/i18n-react';
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
  EuiSpacer,
} from '@elastic/eui';
import type {
  JobType,
  CanDeleteMLSpaceAwareItemsResponse,
  TrainedModelType,
} from '../../../../common/types/saved_objects';
import { useMlApiContext } from '../../contexts/kibana';
import { useToastNotificationService } from '../../services/toast_notification_service';
import { ManagedJobsWarningCallout } from '../../jobs/jobs_list/components/confirm_modals/managed_jobs_warning_callout';

const shouldUnTagJobLabel = i18n.translate(
  'xpack.ml.deleteSpaceAwareItemCheckModal.shouldUnTagLabel.job',
  {
    defaultMessage: 'Remove job from current space',
  }
);
const shouldUnTagModelLabel = i18n.translate(
  'xpack.ml.deleteSpaceAwareItemCheckModal.shouldUnTagLabel.model',
  {
    defaultMessage: 'Remove model from current space',
  }
);

interface ModalContentReturnType {
  buttonText: JSX.Element;
  modalText: JSX.Element;
}

interface CanDeleteMLSpaceAwareItemsSummary {
  canDelete: boolean;
  canRemoveFromSpace: boolean;
  canTakeAnyAction: boolean;
}

function getRespSummary(
  resp: CanDeleteMLSpaceAwareItemsResponse
): CanDeleteMLSpaceAwareItemsSummary {
  const itemsChecked = Object.keys(resp);
  // Default to first item's permissions
  const { canDelete, canRemoveFromSpace } = resp[itemsChecked[0]];
  let canTakeAnyAction = true;

  if (itemsChecked.length > 1) {
    // Check all jobs and make sure they have the same permissions - otherwise no action can be taken
    canTakeAnyAction = itemsChecked.every(
      (id) => resp[id].canDelete === canDelete && resp[id].canRemoveFromSpace === canRemoveFromSpace
    );
  }

  return { canDelete, canRemoveFromSpace, canTakeAnyAction };
}

function getModalContent(
  ids: string[],
  jobType: JobType | TrainedModelType,
  respSummary: CanDeleteMLSpaceAwareItemsSummary,
  hasManagedJob?: boolean
): ModalContentReturnType {
  const { canDelete, canRemoveFromSpace, canTakeAnyAction } = respSummary;

  if (canTakeAnyAction === false) {
    return {
      buttonText: (
        <FormattedMessage
          id="xpack.ml.deleteSpaceAwareItemCheckModal.buttonTextNoAction"
          defaultMessage="Close"
        />
      ),
      modalText: (
        <EuiText>
          <FormattedMessage
            id="xpack.ml.deleteSpaceAwareItemCheckModal.modalTextNoAction"
            defaultMessage="{ids} have different space permissions. "
            values={{ ids: ids.join(', ') }}
          />
          {jobType === 'trained-model' ? (
            <FormattedMessage
              id="xpack.ml.deleteSpaceAwareItemCheckModal.modalTextNoAction.model"
              defaultMessage="When you delete multiple models, they must have the same permissions. Deselect the models and try deleting each model individually."
            />
          ) : (
            <FormattedMessage
              id="xpack.ml.deleteSpaceAwareItemCheckModal.modalTextNoAction.job"
              defaultMessage="When you delete multiple jobs, they must have the same permissions. Deselect the jobs and try deleting each job individually."
            />
          )}
        </EuiText>
      ),
    };
  }

  const noActionContent: ModalContentReturnType = {
    buttonText: (
      <FormattedMessage
        id="xpack.ml.deleteSpaceAwareItemCheckModal.buttonTextClose"
        defaultMessage="Close"
      />
    ),
    modalText: (
      <EuiText>
        <FormattedMessage
          id="xpack.ml.deleteSpaceAwareItemCheckModal.modalTextClose"
          defaultMessage="{ids} cannot be deleted and cannot be removed from the current space. "
          values={{ ids: ids.join(', ') }}
        />
        {jobType === 'trained-model' ? (
          <FormattedMessage
            id="xpack.ml.deleteSpaceAwareItemCheckModal.modalTextClose.model"
            defaultMessage="This model is assigned to the * space and you do not have access to all spaces."
          />
        ) : (
          <FormattedMessage
            id="xpack.ml.deleteSpaceAwareItemCheckModal.modalTextClose.job"
            defaultMessage="This job is assigned to the * space and you do not have access to all spaces."
          />
        )}
      </EuiText>
    ),
  };

  if (canDelete) {
    return {
      buttonText:
        jobType === 'trained-model' ? (
          <FormattedMessage
            id="xpack.ml.deleteSpaceAwareItemCheckModal.buttonTextCanDelete.model"
            defaultMessage="Continue to delete {length, plural, one {# model} other {# models}}"
            values={{ length: ids.length }}
          />
        ) : (
          <FormattedMessage
            id="xpack.ml.deleteSpaceAwareItemCheckModal.buttonTextCanDelete.job"
            defaultMessage="Continue to delete {length, plural, one {# job} other {# jobs}}"
            values={{ length: ids.length }}
          />
        ),
      modalText: (
        <>
          {hasManagedJob ? (
            <>
              <ManagedJobsWarningCallout
                jobsCount={ids.length}
                action={i18n.translate(
                  'xpack.ml.jobsList.deleteJobCheckModal.removeOrDeleteAction',
                  {
                    defaultMessage: 'removing or deleting',
                  }
                )}
              />
              <EuiSpacer size="s" />
            </>
          ) : null}

          <EuiText>
            <FormattedMessage
              id="xpack.ml.deleteSpaceAwareItemCheckModal.modalTextCanDelete"
              defaultMessage="{ids} can be deleted."
              values={{ ids: ids.join(', ') }}
            />
          </EuiText>
        </>
      ),
    };
  } else if (canRemoveFromSpace) {
    return {
      buttonText: (
        <FormattedMessage
          id="xpack.ml.deleteSpaceAwareItemCheckModal.buttonTextCanUnTagConfirm"
          defaultMessage="Remove from current space"
        />
      ),
      modalText: (
        <>
          {hasManagedJob ? (
            <>
              <ManagedJobsWarningCallout
                jobsCount={ids.length}
                action={i18n.translate('xpack.ml.jobsList.deleteJobCheckModal.removeAction', {
                  defaultMessage: 'removing',
                })}
              />
              <EuiSpacer size="s" />
            </>
          ) : null}

          <EuiText>
            <FormattedMessage
              id="xpack.ml.deleteSpaceAwareItemCheckModal.modalTextCanUnTag"
              defaultMessage="{ids} cannot be deleted but can be removed from the current space."
              values={{ ids: ids.join(', ') }}
            />
          </EuiText>
        </>
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
  jobType: JobType | TrainedModelType;
  ids: string[];
  setDidUntag?: React.Dispatch<React.SetStateAction<boolean>>;
  hasManagedJob?: boolean;
}

export const DeleteSpaceAwareItemCheckModal: FC<Props> = ({
  canDeleteCallback,
  onCloseCallback,
  refreshJobsCallback,
  jobType,
  ids,
  setDidUntag,
  hasManagedJob,
}) => {
  const [buttonContent, setButtonContent] = useState<JSX.Element | undefined>();
  const [modalContent, setModalContent] = useState<JSX.Element | undefined>();
  const [hasUntagged, setHasUntagged] = useState<boolean>(false);
  const [isUntagging, setIsUntagging] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [itemCheckRespSummary, setItemCheckRespSummary] = useState<
    CanDeleteMLSpaceAwareItemsSummary | undefined
  >();

  const {
    savedObjects: { canDeleteMLSpaceAwareItems, removeItemFromCurrentSpace },
  } = useMlApiContext();
  const { displayErrorToast, displaySuccessToast } = useToastNotificationService();

  useEffect(() => {
    setIsLoading(true);
    // Do the spaces check and set the content for the modal and buttons depending on results
    canDeleteMLSpaceAwareItems(jobType, ids).then((resp) => {
      const respSummary = getRespSummary(resp);
      const { canDelete, canRemoveFromSpace, canTakeAnyAction } = respSummary;
      if (canTakeAnyAction && canDelete && !canRemoveFromSpace) {
        // Go straight to delete flow if that's the only action available
        canDeleteCallback();
        return;
      }
      setItemCheckRespSummary(respSummary);
      const { buttonText, modalText } = getModalContent(ids, jobType, respSummary, hasManagedJob);
      setButtonContent(buttonText);
      setModalContent(modalText);
    });
    if (typeof setDidUntag === 'function') {
      setDidUntag(false);
    }
    setIsLoading(false);
  }, [hasManagedJob]);

  const onUntagClick = async () => {
    setIsUntagging(true);
    const resp = await removeItemFromCurrentSpace(jobType, ids);
    setIsUntagging(false);
    if (typeof setDidUntag === 'function') {
      setDidUntag(true);
    }
    Object.entries(resp).forEach(([id, { success, error }]) => {
      if (success === false) {
        const title = i18n.translate('xpack.ml.deleteSpaceAwareItemCheckModal.unTagErrorTitle', {
          defaultMessage: 'Error updating {id}',
          values: { id },
        });
        displayErrorToast(error, title);
      } else {
        setHasUntagged(true);
        const message = i18n.translate(
          'xpack.ml.deleteSpaceAwareItemCheckModal.unTagSuccessTitle',
          {
            defaultMessage: 'Successfully updated {id}',
            values: { id },
          }
        );
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
    if (itemCheckRespSummary?.canTakeAnyAction && itemCheckRespSummary?.canDelete) {
      canDeleteCallback();
    } else {
      onCloseCallback();
    }
  };

  return (
    <EuiModal onClose={onCloseCallback} data-test-subj="mlDeleteSpaceAwareItemCheckModalOverlay">
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
                id="xpack.ml.deleteSpaceAwareItemCheckModal.modalTitle"
                defaultMessage="Checking space permissions"
              />
            </EuiModalHeaderTitle>
          </EuiModalHeader>

          <EuiModalBody>{modalContent}</EuiModalBody>

          <EuiModalFooter>
            <EuiFlexGroup justifyContent="spaceBetween">
              <EuiFlexItem grow={false}>
                {!hasUntagged &&
                  itemCheckRespSummary?.canTakeAnyAction &&
                  itemCheckRespSummary?.canRemoveFromSpace &&
                  itemCheckRespSummary?.canDelete && (
                    <EuiButtonEmpty
                      isLoading={isUntagging}
                      color="primary"
                      size="s"
                      onClick={onUntagClick}
                    >
                      {jobType === 'trained-model' ? shouldUnTagModelLabel : shouldUnTagJobLabel}
                    </EuiButtonEmpty>
                  )}
              </EuiFlexItem>
              <EuiFlexItem grow={false}>
                <EuiButton
                  size="s"
                  onClick={
                    itemCheckRespSummary?.canTakeAnyAction &&
                    itemCheckRespSummary?.canRemoveFromSpace &&
                    !itemCheckRespSummary?.canDelete
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
