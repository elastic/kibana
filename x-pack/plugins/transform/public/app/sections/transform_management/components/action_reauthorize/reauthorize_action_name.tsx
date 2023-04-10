/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { FC, useContext } from 'react';
import { i18n } from '@kbn/i18n';
import { EuiToolTip, EuiText } from '@elastic/eui';
import { needsReauthorization } from '../../../../common/reauthorization_utils';
import { TRANSFORM_STATE } from '../../../../../../common/constants';
import {
  AuthorizationContext,
  createCapabilityFailureMessage,
} from '../../../../lib/authorization';
import { TransformListRow } from '../../../../common';

export const reauthorizeActionNameText = i18n.translate(
  'xpack.transform.transformList.reauthorizeActionNameText',
  {
    defaultMessage: 'Reauthorize',
  }
);

export const isReauthorizeActionDisabled = (
  items: TransformListRow[],
  canStartStopTransform: boolean,
  transformNodes: number
) => {
  return !canStartStopTransform || items.length === 0 || transformNodes === 0;
};

export interface ReauthorizeActionNameProps {
  items: TransformListRow[];
  forceDisable?: boolean;
  transformNodes: number;
}
export const ReauthorizeActionName: FC<ReauthorizeActionNameProps> = ({
  items,
  forceDisable,
  transformNodes,
}) => {
  const { canStartStopTransform } = useContext(AuthorizationContext).capabilities;
  const isBulkAction = items.length > 1;

  // Disable start for batch transforms which have completed.
  const transformNeedsReauthorization = items.some((i: TransformListRow) =>
    needsReauthorization(i)
  );
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
      'xpack.transform.transformList.cannotStartCompleteBatchTransformBulkActionToolTip',
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

  const actionIsDisabled = isReauthorizeActionDisabled(
    items,
    canStartStopTransform,
    transformNodes
  );

  let content: string | undefined;
  if (actionIsDisabled && items.length > 0) {
    if (!canStartStopTransform) {
      content = createCapabilityFailureMessage('canStartStopTransform');
    } else if (transformNeedsReauthorization) {
      content = completedBatchTransformMessage;
    } else if (startedTransform) {
      content = startedTransformMessage;
    }
  }

  const text = <EuiText size="s">{reauthorizeActionNameText}</EuiText>;
  if ((forceDisable === true || actionIsDisabled) && content !== undefined) {
    return (
      <EuiToolTip position="top" content={content}>
        {text}
      </EuiToolTip>
    );
  }

  return <>{text}</>;
};
