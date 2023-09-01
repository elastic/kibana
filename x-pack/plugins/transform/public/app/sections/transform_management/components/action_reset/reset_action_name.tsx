/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { type FC } from 'react';

import { EuiToolTip } from '@elastic/eui';

import { i18n } from '@kbn/i18n';

import { TransformState, TRANSFORM_STATE } from '../../../../../../common/constants';
import { createCapabilityFailureMessage } from '../../../../../../common/utils/create_capability_failure_message';

import { TransformListRow } from '../../../../common';

export const resetActionNameText = i18n.translate(
  'xpack.transform.transformList.resetActionNameText',
  {
    defaultMessage: 'Reset',
  }
);

const transformCanNotBeReseted = (i: TransformListRow) =>
  !([TRANSFORM_STATE.STOPPED, TRANSFORM_STATE.FAILED] as TransformState[]).includes(i.stats.state);

export const isResetActionDisabled = (items: TransformListRow[], forceDisable: boolean) => {
  const disabled = items.some(transformCanNotBeReseted);
  return forceDisable === true || disabled;
};

export interface ResetActionNameProps {
  canResetTransform: boolean;
  disabled: boolean;
  isBulkAction: boolean;
}

export const ResetActionName: FC<ResetActionNameProps> = ({
  canResetTransform,
  disabled,
  isBulkAction,
}) => {
  const bulkResetButtonDisabledText = i18n.translate(
    'xpack.transform.transformList.resetBulkActionDisabledToolTipContent',
    {
      defaultMessage: 'One or more selected transforms must be stopped to be reset.',
    }
  );
  const resetButtonDisabledText = i18n.translate(
    'xpack.transform.transformList.resetActionDisabledToolTipContent',
    {
      defaultMessage: 'Stop the transform in order to reset it.',
    }
  );

  if (disabled || !canResetTransform) {
    let content;
    if (disabled) {
      content = isBulkAction ? bulkResetButtonDisabledText : resetButtonDisabledText;
    } else {
      content = createCapabilityFailureMessage('canResetTransform');
    }

    return (
      <EuiToolTip position="top" content={content}>
        <>{resetActionNameText}</>
      </EuiToolTip>
    );
  }

  return <>{resetActionNameText}</>;
};
