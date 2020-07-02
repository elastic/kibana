/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { FC, useContext, useState } from 'react';
import { i18n } from '@kbn/i18n';
import {
  EuiConfirmModal,
  EuiIcon,
  EuiLink,
  EuiOverlayMask,
  EuiToolTip,
  EUI_MODAL_CONFIRM_BUTTON,
} from '@elastic/eui';

import { TRANSFORM_STATE } from '../../../../../../common';

import { useStartTransforms } from '../../../../hooks';
import {
  createCapabilityFailureMessage,
  AuthorizationContext,
} from '../../../../lib/authorization';
import { TransformListRow, isCompletedBatchTransform } from '../../../../common';

interface StartButtonProps {
  items: TransformListRow[];
  forceDisable?: boolean;
  onClick: (items: TransformListRow[]) => void;
}
export const StartButton: FC<StartButtonProps> = ({ items, forceDisable, onClick }) => {
  const { canStartStopTransform } = useContext(AuthorizationContext).capabilities;
  const isBulkAction = items.length > 1;

  const buttonStartText = i18n.translate('xpack.transform.transformList.startActionName', {
    defaultMessage: 'Start',
  });

  // Disable start for batch transforms which have completed.
  const completedBatchTransform = items.some((i: TransformListRow) => isCompletedBatchTransform(i));
  // Disable start action if one of the transforms is already started or trying to restart will throw error
  const startedTransform = items.some(
    (i: TransformListRow) => i.stats.state === TRANSFORM_STATE.STARTED
  );

  let startedTransformMessage;
  let completedBatchTransformMessage;

  if (isBulkAction === true) {
    startedTransformMessage = i18n.translate(
      'xpack.transform.transformList.startedTransformBulkToolTip',
      {
        defaultMessage: 'One or more transforms are already started.',
      }
    );
    completedBatchTransformMessage = i18n.translate(
      'xpack.transform.transformList.completeBatchTransformBulkActionToolTip',
      {
        defaultMessage:
          'One or more transforms are completed batch transforms and cannot be restarted.',
      }
    );
  } else {
    startedTransformMessage = i18n.translate(
      'xpack.transform.transformList.startedTransformToolTip',
      {
        defaultMessage: '{transformId} is already started.',
        values: { transformId: items[0] && items[0].config.id },
      }
    );
    completedBatchTransformMessage = i18n.translate(
      'xpack.transform.transformList.completeBatchTransformToolTip',
      {
        defaultMessage: '{transformId} is a completed batch transform and cannot be restarted.',
        values: { transformId: items[0] && items[0].config.id },
      }
    );
  }

  const actionIsDisabled =
    !canStartStopTransform || completedBatchTransform || startedTransform || items.length === 0;

  let content: string | undefined;
  if (actionIsDisabled && items.length > 0) {
    if (!canStartStopTransform) {
      content = createCapabilityFailureMessage('canStartStopTransform');
    } else if (completedBatchTransform) {
      content = completedBatchTransformMessage;
    } else if (startedTransform) {
      content = startedTransformMessage;
    }
  }

  const disabled = forceDisable === true || actionIsDisabled;

  const startButton = (
    <EuiLink
      data-test-subj="transformActionStart"
      color={disabled ? 'subdued' : 'text'}
      onClick={disabled ? undefined : () => onClick(items)}
    >
      <EuiIcon type="play" /> {buttonStartText}
    </EuiLink>
  );
  if (disabled && content !== undefined) {
    return (
      <EuiToolTip position="top" content={content}>
        {startButton}
      </EuiToolTip>
    );
  }
  return startButton;
};

type StartButtonModalProps = Pick<
  StartAction,
  'closeModal' | 'isModalVisible' | 'items' | 'startAndCloseModal'
>;
export const StartButtonModal: FC<StartButtonModalProps> = ({
  closeModal,
  isModalVisible,
  items,
  startAndCloseModal,
}) => {
  const isBulkAction = items.length > 1;

  const bulkStartModalTitle = i18n.translate('xpack.transform.transformList.bulkStartModalTitle', {
    defaultMessage: 'Start {count} {count, plural, one {transform} other {transforms}}?',
    values: { count: items && items.length },
  });
  const startModalTitle = i18n.translate('xpack.transform.transformList.startModalTitle', {
    defaultMessage: 'Start {transformId}',
    values: { transformId: items[0] && items[0].config.id },
  });

  return (
    <>
      {isModalVisible && (
        <EuiOverlayMask>
          <EuiConfirmModal
            title={isBulkAction === true ? bulkStartModalTitle : startModalTitle}
            onCancel={closeModal}
            onConfirm={startAndCloseModal}
            cancelButtonText={i18n.translate(
              'xpack.transform.transformList.startModalCancelButton',
              {
                defaultMessage: 'Cancel',
              }
            )}
            confirmButtonText={i18n.translate(
              'xpack.transform.transformList.startModalStartButton',
              {
                defaultMessage: 'Start',
              }
            )}
            defaultFocusedButton={EUI_MODAL_CONFIRM_BUTTON}
            buttonColor="primary"
          >
            <p>
              {i18n.translate('xpack.transform.transformList.startModalBody', {
                defaultMessage:
                  'A transform will increase search and indexing load in your cluster. Please stop the transform if excessive load is experienced. Are you sure you want to start {count, plural, one {this} other {these}} {count} {count, plural, one {transform} other {transforms}}?',
                values: { count: items.length },
              })}
            </p>
          </EuiConfirmModal>
        </EuiOverlayMask>
      )}
    </>
  );
};

type StartAction = ReturnType<typeof useStartAction>;
export const useStartAction = () => {
  const startTransforms = useStartTransforms();

  const [isModalVisible, setModalVisible] = useState(false);
  const [items, setItems] = useState<TransformListRow[]>([]);

  const closeModal = () => setModalVisible(false);

  const startAndCloseModal = () => {
    setModalVisible(false);
    startTransforms(items);
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
    isModalVisible,
    items,
    openModal,
    startAndCloseModal,
  };
};
