/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { FC, useContext } from 'react';
import { i18n } from '@kbn/i18n';
import { EuiToolTip } from '@elastic/eui';

import { TRANSFORM_STATE } from '../../../../../../common';

import {
  createCapabilityFailureMessage,
  AuthorizationContext,
} from '../../../../lib/authorization';
import { TransformListRow, isCompletedBatchTransform } from '../../../../common';

export const startActionNameText = i18n.translate(
  'xpack.transform.transformList.startActionNameText',
  {
    defaultMessage: 'Start',
  }
);

export const isStartActionDisabled = (
  items: TransformListRow[],
  canStartStopTransform: boolean
) => {
  // Disable start for batch transforms which have completed.
  const completedBatchTransform = items.some((i: TransformListRow) => isCompletedBatchTransform(i));
  // Disable start action if one of the transforms is already started or trying to restart will throw error
  const startedTransform = items.some(
    (i: TransformListRow) => i.stats.state === TRANSFORM_STATE.STARTED
  );

  return (
    !canStartStopTransform || completedBatchTransform || startedTransform || items.length === 0
  );
};

export interface StartActionNameProps {
  items: TransformListRow[];
  forceDisable?: boolean;
}
export const StartActionName: FC<StartActionNameProps> = ({ items, forceDisable }) => {
  const { canStartStopTransform } = useContext(AuthorizationContext).capabilities;
  const isBulkAction = items.length > 1;

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

  const actionIsDisabled = isStartActionDisabled(items, canStartStopTransform);

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

  if ((forceDisable === true || actionIsDisabled) && content !== undefined) {
    return (
      <EuiToolTip position="top" content={content}>
        <>{startActionNameText}</>
      </EuiToolTip>
    );
  }

  return <>{startActionNameText}</>;
};
