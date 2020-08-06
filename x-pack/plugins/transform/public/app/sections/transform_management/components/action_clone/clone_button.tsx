/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { FC } from 'react';
import { i18n } from '@kbn/i18n';
import { EuiToolTip } from '@elastic/eui';

import { createCapabilityFailureMessage } from '../../../../lib/authorization';

export const cloneActionButtonText = i18n.translate(
  'xpack.transform.transformList.cloneActionName',
  {
    defaultMessage: 'Clone',
  }
);

interface CloneActionProps {
  disabled: boolean;
}

export const CloneButton: FC<CloneActionProps> = ({ disabled }) => {
  if (disabled) {
    return (
      <EuiToolTip position="top" content={createCapabilityFailureMessage('canStartStopTransform')}>
        <>{cloneActionButtonText}</>
      </EuiToolTip>
    );
  }

  return <>{cloneActionButtonText}</>;
};
