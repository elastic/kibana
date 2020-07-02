/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { FC, useContext, useMemo, useState } from 'react';
import { i18n } from '@kbn/i18n';
import {
  EUI_MODAL_CONFIRM_BUTTON,
  EuiConfirmModal,
  EuiFlexGroup,
  EuiFlexItem,
  EuiIcon,
  EuiLink,
  EuiOverlayMask,
  EuiSpacer,
  EuiSwitch,
  EuiToolTip,
} from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n/react';
import { TRANSFORM_STATE } from '../../../../../../common';
import { useDeleteIndexAndTargetIndex, useDeleteTransforms } from '../../../../hooks';
import {
  AuthorizationContext,
  createCapabilityFailureMessage,
} from '../../../../lib/authorization';
import { TransformListRow } from '../../../../common';

interface DeleteButtonProps {
  items: TransformListRow[];
  forceDisable?: boolean;
  onClick: (items: TransformListRow[]) => void;
}

const transformCanNotBeDeleted = (i: TransformListRow) =>
  ![TRANSFORM_STATE.STOPPED, TRANSFORM_STATE.FAILED].includes(i.stats.state);

export const DeleteButton: FC<DeleteButtonProps> = ({ items, forceDisable, onClick }) => {
  const isBulkAction = items.length > 1;

  const disabled = items.some(transformCanNotBeDeleted);
  const { canDeleteTransform } = useContext(AuthorizationContext).capabilities;

  const buttonDeleteText = i18n.translate('xpack.transform.transformList.deleteActionName', {
    defaultMessage: 'Delete',
  });
  const bulkDeleteButtonDisabledText = i18n.translate(
    'xpack.transform.transformList.deleteBulkActionDisabledToolTipContent',
    {
      defaultMessage: 'One or more selected transforms must be stopped in order to be deleted.',
    }
  );
  const deleteButtonDisabledText = i18n.translate(
    'xpack.transform.transformList.deleteActionDisabledToolTipContent',
    {
      defaultMessage: 'Stop the transform in order to delete it.',
    }
  );

  const buttonDisabled = forceDisable === true || disabled || !canDeleteTransform;
  let deleteButton = (
    <EuiLink
      data-test-subj="transformActionDelete"
      color={buttonDisabled ? 'subdued' : 'text'}
      disabled={buttonDisabled}
      onClick={buttonDisabled ? undefined : () => onClick(items)}
      aria-label={buttonDeleteText}
    >
      <EuiIcon type="trash" /> {buttonDeleteText}
    </EuiLink>
  );

  if (disabled || !canDeleteTransform) {
    let content;
    if (disabled) {
      content = isBulkAction ? bulkDeleteButtonDisabledText : deleteButtonDisabledText;
    } else {
      content = createCapabilityFailureMessage('canDeleteTransform');
    }

    deleteButton = (
      <EuiToolTip position="top" content={content}>
        {deleteButton}
      </EuiToolTip>
    );
  }

  return deleteButton;
};

type DeleteButtonModalProps = Pick<
  DeleteAction,
  | 'closeModal'
  | 'deleteAndCloseModal'
  | 'deleteDestIndex'
  | 'deleteIndexPattern'
  | 'indexPatternExists'
  | 'isModalVisible'
  | 'items'
  | 'shouldForceDelete'
  | 'toggleDeleteIndex'
  | 'toggleDeleteIndexPattern'
  | 'userCanDeleteIndex'
>;
export const DeleteButtonModal: FC<DeleteButtonModalProps> = ({
  closeModal,
  deleteAndCloseModal,
  deleteDestIndex,
  deleteIndexPattern,
  indexPatternExists,
  isModalVisible,
  items,
  shouldForceDelete,
  toggleDeleteIndex,
  toggleDeleteIndexPattern,
  userCanDeleteIndex,
}) => {
  const isBulkAction = items.length > 1;

  const bulkDeleteModalTitle = i18n.translate(
    'xpack.transform.transformList.bulkDeleteModalTitle',
    {
      defaultMessage: 'Delete {count} {count, plural, one {transform} other {transforms}}?',
      values: { count: items.length },
    }
  );
  const deleteModalTitle = i18n.translate('xpack.transform.transformList.deleteModalTitle', {
    defaultMessage: 'Delete {transformId}',
    values: { transformId: items[0] && items[0].config.id },
  });
  const bulkDeleteModalContent = (
    <>
      <p>
        {shouldForceDelete ? (
          <FormattedMessage
            id="xpack.transform.transformList.bulkForceDeleteModalBody"
            defaultMessage="Are you sure you want to force delete {count, plural, one {this} other {these}} {count} {count, plural, one {transform} other {transforms}}? The {count, plural, one {transform} other {transforms}} will be deleted regardless of {count, plural, one {its} other {their}} current state."
            values={{ count: items.length }}
          />
        ) : (
          <FormattedMessage
            id="xpack.transform.transformList.bulkDeleteModalBody"
            defaultMessage="Are you sure you want to delete {count, plural, one {this} other {these}} {count} {count, plural, one {transform} other {transforms}}?"
            values={{ count: items.length }}
          />
        )}
      </p>
      <EuiFlexGroup direction="column" gutterSize="none">
        <EuiFlexItem>
          {
            <EuiSwitch
              data-test-subj="transformBulkDeleteIndexSwitch"
              label={i18n.translate(
                'xpack.transform.actionDeleteTransform.bulkDeleteDestinationIndexTitle',
                {
                  defaultMessage: 'Delete destination indices',
                }
              )}
              checked={deleteDestIndex}
              onChange={toggleDeleteIndex}
            />
          }
        </EuiFlexItem>
        <EuiSpacer size="s" />
        <EuiFlexItem>
          {
            <EuiSwitch
              data-test-subj="transformBulkDeleteIndexPatternSwitch"
              label={i18n.translate(
                'xpack.transform.actionDeleteTransform.bulkDeleteDestIndexPatternTitle',
                {
                  defaultMessage: 'Delete destination index patterns',
                }
              )}
              checked={deleteIndexPattern}
              onChange={toggleDeleteIndexPattern}
            />
          }
        </EuiFlexItem>
      </EuiFlexGroup>
    </>
  );

  const deleteModalContent = (
    <>
      <p>
        {items[0] && items[0] && items[0].stats.state === TRANSFORM_STATE.FAILED ? (
          <FormattedMessage
            id="xpack.transform.transformList.forceDeleteModalBody"
            defaultMessage="Are you sure you want to force delete this transform? The transform will be deleted regardless of its current state."
          />
        ) : (
          <FormattedMessage
            id="xpack.transform.transformList.deleteModalBody"
            defaultMessage="Are you sure you want to delete this transform?"
          />
        )}
      </p>
      <EuiFlexGroup direction="column" gutterSize="none">
        <EuiFlexItem>
          {userCanDeleteIndex && (
            <EuiSwitch
              data-test-subj="transformDeleteIndexSwitch"
              label={i18n.translate(
                'xpack.transform.actionDeleteTransform.deleteDestinationIndexTitle',
                {
                  defaultMessage: 'Delete destination index {destinationIndex}',
                  values: { destinationIndex: items[0] && items[0].config.dest.index },
                }
              )}
              checked={deleteDestIndex}
              onChange={toggleDeleteIndex}
            />
          )}
        </EuiFlexItem>
        {userCanDeleteIndex && indexPatternExists && (
          <EuiFlexItem>
            <EuiSpacer size="s" />
            <EuiSwitch
              data-test-subj="transformDeleteIndexPatternSwitch"
              label={i18n.translate(
                'xpack.transform.actionDeleteTransform.deleteDestIndexPatternTitle',
                {
                  defaultMessage: 'Delete index pattern {destinationIndex}',
                  values: { destinationIndex: items[0] && items[0].config.dest.index },
                }
              )}
              checked={deleteIndexPattern}
              onChange={toggleDeleteIndexPattern}
            />
          </EuiFlexItem>
        )}
      </EuiFlexGroup>
    </>
  );

  return (
    <>
      {isModalVisible && (
        <EuiOverlayMask>
          <EuiConfirmModal
            title={isBulkAction === true ? bulkDeleteModalTitle : deleteModalTitle}
            onCancel={closeModal}
            onConfirm={deleteAndCloseModal}
            cancelButtonText={i18n.translate(
              'xpack.transform.transformList.deleteModalCancelButton',
              {
                defaultMessage: 'Cancel',
              }
            )}
            confirmButtonText={i18n.translate(
              'xpack.transform.transformList.deleteModalDeleteButton',
              {
                defaultMessage: 'Delete',
              }
            )}
            defaultFocusedButton={EUI_MODAL_CONFIRM_BUTTON}
            buttonColor="danger"
          >
            {isBulkAction ? bulkDeleteModalContent : deleteModalContent}
          </EuiConfirmModal>
        </EuiOverlayMask>
      )}
    </>
  );
};

type DeleteAction = ReturnType<typeof useDeleteAction>;
export const useDeleteAction = () => {
  const deleteTransforms = useDeleteTransforms();

  const [isModalVisible, setModalVisible] = useState(false);
  const [items, setItems] = useState<TransformListRow[]>([]);

  const isBulkAction = items.length > 1;
  const shouldForceDelete = useMemo(
    () => items.some((i: TransformListRow) => i.stats.state === TRANSFORM_STATE.FAILED),
    [items]
  );

  const closeModal = () => setModalVisible(false);

  const {
    userCanDeleteIndex,
    deleteDestIndex,
    indexPatternExists,
    deleteIndexPattern,
    toggleDeleteIndex,
    toggleDeleteIndexPattern,
  } = useDeleteIndexAndTargetIndex(items);

  const deleteAndCloseModal = () => {
    setModalVisible(false);

    const shouldDeleteDestIndex = userCanDeleteIndex && deleteDestIndex;
    const shouldDeleteDestIndexPattern =
      userCanDeleteIndex && indexPatternExists && deleteIndexPattern;
    // if we are deleting multiple transforms, then force delete all if at least one item has failed
    // else, force delete only when the item user picks has failed
    const forceDelete = isBulkAction
      ? shouldForceDelete
      : items[0] && items[0] && items[0].stats.state === TRANSFORM_STATE.FAILED;
    deleteTransforms(items, shouldDeleteDestIndex, shouldDeleteDestIndexPattern, forceDelete);
  };

  const openModal = (newItems: TransformListRow[]) => {
    // EUI issue: Might trigger twice, one time as an array,
    // one time as a single object. See https://github.com/elastic/eui/issues/3679
    if (Array.isArray(newItems)) {
      setItems(newItems);
      setModalVisible(true);
    }
  };

  return {
    closeModal,
    deleteAndCloseModal,
    deleteDestIndex,
    deleteIndexPattern,
    indexPatternExists,
    isModalVisible,
    items,
    openModal,
    shouldForceDelete,
    toggleDeleteIndex,
    toggleDeleteIndexPattern,
    userCanDeleteIndex,
  };
};
