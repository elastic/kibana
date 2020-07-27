/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { FC, useContext } from 'react';
import { useHistory } from 'react-router-dom';
import { i18n } from '@kbn/i18n';
import { EuiButtonEmpty, EuiToolTip } from '@elastic/eui';

import {
  createCapabilityFailureMessage,
  AuthorizationContext,
} from '../../../../lib/authorization';

import { SECTION_SLUG } from '../../../../constants';

interface CloneActionProps {
  itemId: string;
}

export const CloneButton: FC<CloneActionProps> = ({ itemId }) => {
  const history = useHistory();

  const { canCreateTransform } = useContext(AuthorizationContext).capabilities;

  const buttonText = i18n.translate('xpack.transform.transformList.cloneActionName', {
    defaultMessage: 'Clone',
  });

  function clickHandler() {
    history.push(`/${SECTION_SLUG.CLONE_TRANSFORM}/${itemId}`);
  }

  const buttonDisabled = !canCreateTransform;

  const button = (
    <EuiButtonEmpty
      aria-label={buttonText}
      color="text"
      data-test-subj="transformActionClone"
      flush="left"
      iconType="copy"
      isDisabled={buttonDisabled}
      onClick={clickHandler}
      size="s"
    >
      {buttonText}
    </EuiButtonEmpty>
  );

  if (buttonDisabled) {
    return (
      <EuiToolTip position="top" content={createCapabilityFailureMessage('canStartStopTransform')}>
        {button}
      </EuiToolTip>
    );
  }

  return button;
};
