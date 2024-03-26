/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { type FC } from 'react';

import { EuiToolTip } from '@elastic/eui';

import { i18n } from '@kbn/i18n';

import { missingTransformStats } from '../../../../common/transform_list';
import { createNoStatsTooltipMessage } from '../../../../../../common/utils/create_stats_unknown_message';
import { createCapabilityFailureMessage } from '../../../../../../common/utils/create_capability_failure_message';

import { useTransformCapabilities } from '../../../../hooks';
import type { TransformListRow } from '../../../../common';
import { isCompletedBatchTransform } from '../../../../common';

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
    transformNodes === 0 ||
    missingTransformStats(items)
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
  const { canScheduleNowTransform } = useTransformCapabilities();
  const isBulkAction = items.length > 1;

  // Disable schedule-now for batch transforms which have completed.
  const completedBatchTransform = items.some((i: TransformListRow) => isCompletedBatchTransform(i));

  let completedBatchTransformMessage;

  if (isBulkAction === true) {
    completedBatchTransformMessage = i18n.translate(
      'xpack.transform.transformList.cannotScheduleNowCompleteBatchTransformBulkActionToolTip',
      {
        defaultMessage:
          'One or more transforms are completed batch transforms and cannot be scheduled to process data instantly.',
      }
    );
  } else {
    completedBatchTransformMessage = i18n.translate(
      'xpack.transform.transformList.cannotScheduleNowCompleteBatchTransformToolTip',
      {
        defaultMessage:
          '{transformId} is a completed batch transform and cannot be scheduled to process data instantly.',
        values: { transformId: items[0] && items[0].config.id },
      }
    );
  }

  const actionIsDisabled = isScheduleNowActionDisabled(
    items,
    canScheduleNowTransform,
    transformNodes
  );

  let content: string = i18n.translate('xpack.transform.transformList.scheduleNowToolTip', {
    defaultMessage:
      'Schedule the transform to instantly process data without waiting for the configured interval between checks for changes in the source indices.',
  });

  if (actionIsDisabled && items.length > 0) {
    if (!canScheduleNowTransform) {
      content = createCapabilityFailureMessage('canScheduleNowTransform');
    } else if (completedBatchTransform) {
      content = completedBatchTransformMessage;
    } else if (missingTransformStats(items)) {
      content = createNoStatsTooltipMessage({
        actionName: scheduleNowActionNameText,
        count: items.length,
      });
    }
  }

  return (
    <EuiToolTip position="top" content={content}>
      <>{scheduleNowActionNameText}</>
    </EuiToolTip>
  );
};
