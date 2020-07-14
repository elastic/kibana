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

  const buttonEditText = i18n.translate('xpack.transform.transformList.editActionName', {
    defaultMessage: 'Edit',
  });

  const disabled = !canCreateTransform;

  const editButton = (
    <EuiButtonEmpty
      aria-label={buttonEditText}
      color="text"
      data-test-subj="transformActionEdit"
      flush="left"
      iconType="pencil"
      isDisabled={disabled}
      onClick={onClick}
      size="s"
    >
      {buttonEditText}
    </EuiButtonEmpty>
  );

  if (!canCreateTransform) {
    const content = createCapabilityFailureMessage('canStartStopTransform');

    return (
      <EuiToolTip position="top" content={content}>
        {editButton}
      </EuiToolTip>
    );
  }

  return editButton;
};
