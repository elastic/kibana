/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { FC, Fragment, useContext, useMemo, useState } from 'react';
import { i18n } from '@kbn/i18n';
import {
  EUI_MODAL_CONFIRM_BUTTON,
  EuiButtonEmpty,
  EuiConfirmModal,
  EuiFlexGroup,
  EuiFlexItem,
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

interface DeleteActionProps {
  items: TransformListRow[];
  forceDisable?: boolean;
}

const transformCanNotBeDeleted = (i: TransformListRow) =>
  ![TRANSFORM_STATE.STOPPED, TRANSFORM_STATE.FAILED].includes(i.stats.state);

export const DeleteAction: FC<DeleteActionProps> = ({ items, forceDisable }) => {
  const isBulkAction = items.length > 1;

  const disabled = items.some(transformCanNotBeDeleted);
  const shouldForceDelete = useMemo(
    () => items.some((i: TransformListRow) => i.stats.state === TRANSFORM_STATE.FAILED),
    [items]
  );
  const { canDeleteTransform } = useContext(AuthorizationContext).capabilities;
  const deleteTransforms = useDeleteTransforms();
  const {
    userCanDeleteIndex,
    deleteDestIndex,
    indexPatternExists,
    deleteIndexPattern,
    toggleDeleteIndex,
    toggleDeleteIndexPattern,
  } = useDeleteIndexAndTargetIndex(items);

  const [isModalVisible, setModalVisible] = useState(false);

  const closeModal = () => setModalVisible(false);
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
  const openModal = () => setModalVisible(true);

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

  let deleteButton = (
    <EuiButtonEmpty
      size="xs"
      color="text"
      disabled={forceDisable === true || disabled || !canDeleteTransform}
      iconType="trash"
      onClick={openModal}
      aria-label={buttonDeleteText}
    >
      {buttonDeleteText}
    </EuiButtonEmpty>
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

  return (
    <Fragment>
      {deleteButton}
      {isModalVisible && (
        <EuiOverlayMask>
          <EuiConfirmModal
            title={isBulkAction ? bulkDeleteModalTitle : deleteModalTitle}
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
    </Fragment>
  );
};
