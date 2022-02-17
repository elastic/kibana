/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useContext, FC, MouseEventHandler } from 'react';

import { EuiButton, EuiToolTip } from '@elastic/eui';

import { FormattedMessage } from '@kbn/i18n-react';

import {
  createCapabilityFailureMessage,
  AuthorizationContext,
} from '../../../../lib/authorization';

interface CreateTransformButtonProps {
  onClick: MouseEventHandler<HTMLButtonElement>;
  transformNodes: number;
}

export const CreateTransformButton: FC<CreateTransformButtonProps> = ({
  onClick,
  transformNodes,
}) => {
  const { capabilities } = useContext(AuthorizationContext);

  const disabled =
    !capabilities.canCreateTransform ||
    !capabilities.canPreviewTransform ||
    !capabilities.canStartStopTransform ||
    transformNodes === 0;

  const createTransformButton = (
    <EuiButton
      disabled={disabled}
      fill
      onClick={onClick}
      iconType="plusInCircle"
      data-test-subj="transformButtonCreate"
    >
      <FormattedMessage
        id="xpack.transform.transformList.createTransformButton"
        defaultMessage="Create a transform"
      />
    </EuiButton>
  );

  if (disabled) {
    return (
      <EuiToolTip
        position="top"
        content={createCapabilityFailureMessage(
          transformNodes > 0 ? 'canCreateTransform' : 'noTransformNodes'
        )}
      >
        {createTransformButton}
      </EuiToolTip>
    );
  }

  return createTransformButton;
};
