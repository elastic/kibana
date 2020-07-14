/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { useContext, FC } from 'react';

import { i18n } from '@kbn/i18n';

import { EuiButtonEmpty, EuiToolTip } from '@elastic/eui';

import {
  createCapabilityFailureMessage,
  AuthorizationContext,
} from '../../../../lib/authorization';

interface EditButtonProps {
  onClick: () => void;
}
export const EditButton: FC<EditButtonProps> = ({ onClick }) => {
  const { canCreateTransform } = useContext(AuthorizationContext).capabilities;

  const buttonText = i18n.translate('xpack.transform.transformList.editActionName', {
    defaultMessage: 'Edit',
  });

  const buttonDisabled = !canCreateTransform;

  const button = (
    <EuiButtonEmpty
      aria-label={buttonText}
      color="text"
      data-test-subj="transformActionEdit"
      flush="left"
      iconType="pencil"
      isDisabled={buttonDisabled}
      onClick={onClick}
      size="s"
    >
      {buttonText}
    </EuiButtonEmpty>
  );

  if (!canCreateTransform) {
    return (
      <EuiToolTip position="top" content={createCapabilityFailureMessage('canStartStopTransform')}>
        {button}
      </EuiToolTip>
    );
  }

  return button;
};
