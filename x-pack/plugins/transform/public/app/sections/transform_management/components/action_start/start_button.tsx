/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { FC, useContext } from 'react';
import { i18n } from '@kbn/i18n';
import { EuiButtonEmpty, EuiToolTip } from '@elastic/eui';

import { TRANSFORM_STATE } from '../../../../../../common';

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

  const buttonText = i18n.translate('xpack.transform.transformList.startActionName', {
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

  const buttonDisabled = forceDisable === true || actionIsDisabled;

  const button = (
    <EuiButtonEmpty
      aria-label={buttonText}
      color="text"
      data-test-subj="transformActionStart"
      flush="left"
      iconType="play"
      isDisabled={buttonDisabled}
      onClick={() => onClick(items)}
      size="s"
    >
      {buttonText}
    </EuiButtonEmpty>
  );

  if (buttonDisabled && content !== undefined) {
    return (
      <EuiToolTip position="top" content={content}>
        {button}
      </EuiToolTip>
    );
  }

  return button;
};
