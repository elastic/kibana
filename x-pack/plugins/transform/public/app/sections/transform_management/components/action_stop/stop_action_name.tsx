/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { type FC } from 'react';
import { i18n } from '@kbn/i18n';
import { EuiToolTip } from '@elastic/eui';

import type { TransformCapabilities } from '../../../../../../common/types/capabilities';
import {
  isTransformListRowWithStats,
  missingTransformStats,
} from '../../../../common/transform_list';
import { createNoStatsTooltipMessage } from '../../../../../../common/utils/create_stats_unknown_message';
import { TRANSFORM_STATE } from '../../../../../../common/constants';
import { createCapabilityFailureMessage } from '../../../../../../common/utils/create_capability_failure_message';

import type { TransformListRow } from '../../../../common';
import { useTransformCapabilities } from '../../../../hooks';

export const stopActionNameText = i18n.translate(
  'xpack.transform.transformList.stopActionNameText',
  {
    defaultMessage: 'Stop',
  }
);

export const getStopActionDisabledMessage = ({
  items,
  capabilities,
}: {
  items: TransformListRow[];
  capabilities: TransformCapabilities;
}) => {
  const isBulkAction = items.length > 1;

  const { canStartStopTransform } = capabilities;

  if (missingTransformStats(items)) {
    return createNoStatsTooltipMessage({
      actionName: stopActionNameText,
      count: items.length,
    });
  }

  // Disable stop action if one of the transforms is stopped already
  const stoppedTransform = items.some(
    (i: TransformListRow) =>
      isTransformListRowWithStats(i) && i.stats.state === TRANSFORM_STATE.STOPPED
  );

  if (!canStartStopTransform) {
    return createCapabilityFailureMessage('canStartStopTransform');
  }

  if (stoppedTransform) {
    return isBulkAction === true
      ? i18n.translate('xpack.transform.transformList.stoppedTransformBulkToolTip', {
          defaultMessage: 'One or more transforms are already stopped.',
        })
      : i18n.translate('xpack.transform.transformList.stoppedTransformToolTip', {
          defaultMessage: '{transformId} is already stopped.',
          values: { transformId: items[0] && items[0].config.id },
        });
  }
};

export const isStopActionDisabled = (
  items: TransformListRow[],
  canStartStopTransform: boolean,
  forceDisable: boolean
) => {
  // Disable stop action if one of the transforms is stopped already
  const stoppedTransform = items.some(
    (i: TransformListRow) => i.stats?.state === TRANSFORM_STATE.STOPPED
  );

  return (
    forceDisable === true ||
    !canStartStopTransform ||
    stoppedTransform === true ||
    missingTransformStats(items)
  );
};

export interface StopActionNameProps {
  items: TransformListRow[];
  forceDisable?: boolean;
}
export const StopActionName: FC<StopActionNameProps> = ({ items, forceDisable }) => {
  const capabilities = useTransformCapabilities();
  // Disable transforms if stats does not exist
  const stoppedTransformMessage = getStopActionDisabledMessage({
    items,
    capabilities,
  });
  if (forceDisable || stoppedTransformMessage) {
    return (
      <EuiToolTip position="top" content={stoppedTransformMessage}>
        <>{stopActionNameText}</>
      </EuiToolTip>
    );
  }

  return <>{stopActionNameText}</>;
};
