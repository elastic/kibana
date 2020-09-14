/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { FC, useContext } from 'react';
import { i18n } from '@kbn/i18n';
import { EuiToolTip } from '@elastic/eui';

import { TRANSFORM_STATE } from '../../../../../../common';

import { TransformListRow } from '../../../../common';
import {
  createCapabilityFailureMessage,
  AuthorizationContext,
} from '../../../../lib/authorization';

export const stopActionNameText = i18n.translate(
  'xpack.transform.transformList.stopActionNameText',
  {
    defaultMessage: 'Stop',
  }
);

export const isStopActionDisabled = (
  items: TransformListRow[],
  canStartStopTransform: boolean,
  forceDisable: boolean
) => {
  // Disable stop action if one of the transforms is stopped already
  const stoppedTransform = items.some(
    (i: TransformListRow) => i.stats.state === TRANSFORM_STATE.STOPPED
  );

  return forceDisable === true || !canStartStopTransform || stoppedTransform === true;
};

export interface StopActionNameProps {
  items: TransformListRow[];
  forceDisable?: boolean;
}
export const StopActionName: FC<StopActionNameProps> = ({ items, forceDisable }) => {
  const isBulkAction = items.length > 1;
  const { canStartStopTransform } = useContext(AuthorizationContext).capabilities;

  // Disable stop action if one of the transforms is stopped already
  const stoppedTransform = items.some(
    (i: TransformListRow) => i.stats.state === TRANSFORM_STATE.STOPPED
  );

  let stoppedTransformMessage;
  if (isBulkAction === true) {
    stoppedTransformMessage = i18n.translate(
      'xpack.transform.transformList.stoppedTransformBulkToolTip',
      {
        defaultMessage: 'One or more transforms are already stopped.',
      }
    );
  } else {
    stoppedTransformMessage = i18n.translate(
      'xpack.transform.transformList.stoppedTransformToolTip',
      {
        defaultMessage: '{transformId} is already stopped.',
        values: { transformId: items[0] && items[0].config.id },
      }
    );
  }

  if (!canStartStopTransform || stoppedTransform) {
    return (
      <EuiToolTip
        position="top"
        content={
          !canStartStopTransform
            ? createCapabilityFailureMessage('canStartStopTransform')
            : stoppedTransformMessage
        }
      >
        <>{stopActionNameText}</>
      </EuiToolTip>
    );
  }

  return <>{stopActionNameText}</>;
};
