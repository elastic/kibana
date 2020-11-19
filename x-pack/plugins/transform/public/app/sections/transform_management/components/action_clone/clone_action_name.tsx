/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { FC } from 'react';
import { i18n } from '@kbn/i18n';
import { EuiToolTip } from '@elastic/eui';

import { createCapabilityFailureMessage } from '../../../../lib/authorization';

export const cloneActionNameText = i18n.translate(
  'xpack.transform.transformList.cloneActionNameText',
  {
    defaultMessage: 'Clone',
  }
);

interface CloneActionNameProps {
  disabled: boolean;
}

export const CloneActionName: FC<CloneActionNameProps> = ({ disabled }) => {
  if (disabled) {
    return (
      <EuiToolTip position="top" content={createCapabilityFailureMessage('canStartStopTransform')}>
        <>{cloneActionNameText}</>
      </EuiToolTip>
    );
  }

  return <>{cloneActionNameText}</>;
};
