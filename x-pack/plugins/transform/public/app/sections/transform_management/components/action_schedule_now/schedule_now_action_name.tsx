/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { FC, useContext } from 'react';
import { i18n } from '@kbn/i18n';
import { EuiToolTip } from '@elastic/eui';

import {
  createCapabilityFailureMessage,
  AuthorizationContext,
} from '../../../../lib/authorization';
import { TransformListRow, isCompletedBatchTransform } from '../../../../common';

export const scheduleNowActionNameText = i18n.translate(
  'xpack.transform.transformList.scheduleNowActionNameText',
  {
    defaultMessage: 'Schedule now',
  }
);

export const isScheduleNowActionDisabled = (
  items: TransformListRow[],
  canScheduleNowTransform: boolean,
  transformNodes: number
) => {
  // Disable schedule-now for batch transforms which have completed.
  const completedBatchTransform = items.some((i: TransformListRow) => isCompletedBatchTransform(i));

  return (
    !canScheduleNowTransform ||
    completedBatchTransform ||
    items.length === 0 ||
    transformNodes === 0
  );
};

export interface ScheduleNowActionNameProps {
  items: TransformListRow[];
  forceDisable?: boolean;
  transformNodes: number;
}
export const ScheduleNowActionName: FC<ScheduleNowActionNameProps> = ({
  items,
  forceDisable,
  transformNodes,
}) => {
  const { canScheduleNowTransform } = useContext(AuthorizationContext).capabilities;
  const isBulkAction = items.length > 1;

  // Disable schedule-now for batch transforms which have completed.
  const completedBatchTransform = items.some((i: TransformListRow) => isCompletedBatchTransform(i));

  let completedBatchTransformMessage;

  if (isBulkAction === true) {
    completedBatchTransformMessage = i18n.translate(
      'xpack.transform.transformList.cannotScheduleNowCompleteBatchTransformBulkActionToolTip',
      {
        defaultMessage:
          'One or more transforms are completed batch transforms and cannot be scheduled now.',
      }
    );
  } else {
    completedBatchTransformMessage = i18n.translate(
      'xpack.transform.transformList.cannotScheduleNowCompleteBatchTransformToolTip',
      {
        defaultMessage: '{transformId} is a completed batch transform and cannot be scheduled now.',
        values: { transformId: items[0] && items[0].config.id },
      }
    );
  }

  const actionIsDisabled = isScheduleNowActionDisabled(
    items,
    canScheduleNowTransform,
    transformNodes
  );

  let content: string | undefined;
  if (actionIsDisabled && items.length > 0) {
    if (!canScheduleNowTransform) {
      content = createCapabilityFailureMessage('canScheduleNowTransform');
    } else if (completedBatchTransform) {
      content = completedBatchTransformMessage;
    }
  }

  if ((forceDisable === true || actionIsDisabled) && content !== undefined) {
    return (
      <EuiToolTip position="top" content={content}>
        <>{scheduleNowActionNameText}</>
      </EuiToolTip>
    );
  }

  return <>{scheduleNowActionNameText}</>;
};
