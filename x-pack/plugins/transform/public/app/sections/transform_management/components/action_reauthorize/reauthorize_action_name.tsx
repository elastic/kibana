/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { type FC } from 'react';

import { EuiToolTip, EuiText } from '@elastic/eui';

import { i18n } from '@kbn/i18n';

import { createCapabilityFailureMessage } from '../../../../../../common/utils/create_capability_failure_message';

import { needsReauthorization } from '../../../../common/reauthorization_utils';
import { useTransformCapabilities } from '../../../../hooks';
import type { TransformListRow } from '../../../../common';

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
  return (
    !canStartStopTransform ||
    items.length === 0 ||
    transformNodes === 0 ||
    !items.some(needsReauthorization)
  );
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
  const { canStartStopTransform } = useTransformCapabilities();

  const someNeedsReauthorization = items.some(needsReauthorization);

  const actionIsDisabled = isReauthorizeActionDisabled(
    items,
    canStartStopTransform,
    transformNodes
  );

  let content: string | undefined;
  if (actionIsDisabled && items.length > 0) {
    if (!canStartStopTransform && someNeedsReauthorization) {
      content = createCapabilityFailureMessage('canReauthorizeTransform');
    }
    if (!someNeedsReauthorization) {
      content = i18n.translate(
        'xpack.transform.transformList.reauthorizeBulkActionDisabledToolTipContent',
        {
          defaultMessage: 'One or more selected transforms must require reauthorization.',
        }
      );
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
