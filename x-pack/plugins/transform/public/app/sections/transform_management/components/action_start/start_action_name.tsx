/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { type FC } from 'react';
import { i18n } from '@kbn/i18n';
import { EuiToolTip } from '@elastic/eui';

import { createNoStatsTooltipMessage } from '../../../../../../common/utils/create_stats_unknown_message';
import { missingTransformStats } from '../../../../common/transform_list';
import { TRANSFORM_STATE } from '../../../../../../common/constants';
import { createCapabilityFailureMessage } from '../../../../../../common/utils/create_capability_failure_message';

import { useTransformCapabilities } from '../../../../hooks';
import type { TransformListRow } from '../../../../common';
import { isCompletedBatchTransform } from '../../../../common';

export const startActionNameText = i18n.translate(
  'xpack.transform.transformList.startActionNameText',
  {
    defaultMessage: 'Start',
  }
);

export const isStartActionDisabled = (
  items: TransformListRow[],
  canStartStopTransform: boolean,
  transformNodes: number
) => {
  // Disable start for batch transforms which have completed.
  const completedBatchTransform = items.some((i: TransformListRow) => isCompletedBatchTransform(i));
  // Disable start action if one of the transforms is already started or trying to restart will throw error
  const startedTransform = items.some(
    (i: TransformListRow) => i.stats?.state === TRANSFORM_STATE.STARTED
  );

  return (
    !canStartStopTransform ||
    completedBatchTransform ||
    startedTransform ||
    items.length === 0 ||
    transformNodes === 0 ||
    missingTransformStats(items)
  );
};

export interface StartActionNameProps {
  items: TransformListRow[];
  forceDisable?: boolean;
  transformNodes: number;
}
export const StartActionName: FC<StartActionNameProps> = ({
  items,
  forceDisable,
  transformNodes,
}) => {
  const { canStartStopTransform } = useTransformCapabilities();
  const isBulkAction = items.length > 1;

  // Disable start for batch transforms which have completed.
  const completedBatchTransform = items.some((i: TransformListRow) => isCompletedBatchTransform(i));
  // Disable if one of the transforms is already started or trying to restart will throw error
  const startedTransform = items.some(
    (i: TransformListRow) => i.stats?.state === TRANSFORM_STATE.STARTED
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
      'xpack.transform.transformList.cannotRestartCompleteBatchTransformBulkActionToolTip',
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
      'xpack.transform.transformList.cannotRestartCompleteBatchTransformToolTip',
      {
        defaultMessage: '{transformId} is a completed batch transform and cannot be restarted.',
        values: { transformId: items[0] && items[0].config.id },
      }
    );
  }

  const actionIsDisabled = isStartActionDisabled(items, canStartStopTransform, transformNodes);

  let content: string | undefined;
  if (actionIsDisabled && items.length > 0) {
    if (!canStartStopTransform) {
      content = createCapabilityFailureMessage('canStartStopTransform');
    } else if (completedBatchTransform) {
      content = completedBatchTransformMessage;
    } else if (startedTransform) {
      content = startedTransformMessage;
    } else if (missingTransformStats(items)) {
      content = createNoStatsTooltipMessage({
        actionName: startActionNameText,
        count: items.length,
      });
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
