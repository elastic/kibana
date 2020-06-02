/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { Fragment, FC, useContext, useState } from 'react';
import { i18n } from '@kbn/i18n';
import {
  EuiButtonEmpty,
  EuiConfirmModal,
  EuiOverlayMask,
  EuiToolTip,
  EUI_MODAL_CONFIRM_BUTTON,
  EuiFlexGroup,
  EuiFlexItem,
  EuiSwitch,
} from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n/react';
import { TRANSFORM_STATE } from '../../../../../../common';
import { useDeleteTransforms, useDeleteIndexAndTargetIndex } from '../../../../hooks';
import {
  createCapabilityFailureMessage,
  AuthorizationContext,
} from '../../../../lib/authorization';
import { TransformListRow } from '../../../../common';

interface DeleteActionProps {
  items: TransformListRow[];
  forceDisable?: boolean;
}

export const DeleteAction: FC<DeleteActionProps> = ({ items, forceDisable }) => {
  const isBulkAction = items.length > 1;

  const disabled = items.some((i: TransformListRow) => i.stats.state !== TRANSFORM_STATE.STOPPED);

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
    deleteTransforms(items, shouldDeleteDestIndex, shouldDeleteDestIndexPattern);
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
  const bulkDeleteModalMessage = (
    <>
      <p>
        <FormattedMessage
          id="xpack.transform.transformList.bulkDeleteModalBody"
          defaultMessage="Are you sure you want to delete {count, plural, one {this} other {these}} {count} {count, plural, one {transform} other {transforms}}?"
          values={{ count: items.length }}
        />
      </p>
      <EuiFlexGroup direction="column" gutterSize="none">
        <EuiFlexItem>
          {
            <EuiSwitch
              data-test-subj="mlAnalyticsJobDeleteIndexSwitch"
              style={{ paddingBottom: 10 }}
              label={i18n.translate(
                'xpack.ml.dataframe.analyticsList.deleteDestinationIndexTitle',
                {
                  defaultMessage: 'Delete destination index',
                }
              )}
              checked={deleteDestIndex}
              onChange={toggleDeleteIndex}
            />
          }
        </EuiFlexItem>
        <EuiFlexItem>
          {
            <EuiSwitch
              data-test-subj="mlAnalyticsJobDeleteIndexPatternSwitch"
              label={i18n.translate(
                'xpack.ml.dataframe.analyticsList.deleteDestIndexPatternTitle',
                {
                  defaultMessage: 'Delete index pattern',
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

  const deleteModalMessage = (
    <React.Fragment>
      <p>
        <FormattedMessage
          id="xpack.transform.transformList.deleteModalBody"
          defaultMessage="Are you sure you want to delete this transform?"
        />
      </p>
      <EuiFlexGroup direction="column" gutterSize="none">
        <EuiFlexItem>
          {userCanDeleteIndex && (
            <EuiSwitch
              data-test-subj="mlAnalyticsJobDeleteIndexSwitch"
              style={{ paddingBottom: 10 }}
              label={i18n.translate(
                'xpack.ml.dataframe.analyticsList.deleteDestinationIndexTitle',
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
        <EuiFlexItem>
          {userCanDeleteIndex && indexPatternExists && (
            <EuiSwitch
              data-test-subj="mlAnalyticsJobDeleteIndexPatternSwitch"
              label={i18n.translate(
                'xpack.ml.dataframe.analyticsList.deleteDestIndexPatternTitle',
                {
                  defaultMessage: 'Delete index pattern {destinationIndex}',
                  values: { destinationIndex: items[0] && items[0].config.dest.index },
                }
              )}
              checked={deleteIndexPattern}
              onChange={toggleDeleteIndexPattern}
            />
          )}
        </EuiFlexItem>
      </EuiFlexGroup>
    </React.Fragment>
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
            {isBulkAction ? bulkDeleteModalMessage : deleteModalMessage}
          </EuiConfirmModal>
        </EuiOverlayMask>
      )}
    </Fragment>
  );
};
