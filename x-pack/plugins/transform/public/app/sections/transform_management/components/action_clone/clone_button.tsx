/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { FC, useContext } from 'react';
import { useHistory } from 'react-router-dom';
import { i18n } from '@kbn/i18n';
import { EuiIcon, EuiLink, EuiToolTip } from '@elastic/eui';

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

  const buttonCloneText = i18n.translate('xpack.transform.transformList.cloneActionName', {
    defaultMessage: 'Clone',
  });

  function clickHandler() {
    history.push(`/${SECTION_SLUG.CLONE_TRANSFORM}/${itemId}`);
  }

  const cloneButton = (
    <EuiLink
      data-test-subj="transformActionClone"
      color={!canCreateTransform ? 'subdued' : 'text'}
      disabled={!canCreateTransform}
      onClick={!canCreateTransform ? undefined : clickHandler}
      aria-label={buttonCloneText}
    >
      <EuiIcon type="copy" /> {buttonCloneText}
    </EuiLink>
  );

  if (!canCreateTransform) {
    const content = createCapabilityFailureMessage('canStartStopTransform');

    return (
      <EuiToolTip position="top" content={content}>
        {cloneButton}
      </EuiToolTip>
    );
  }

  return <>{cloneButton}</>;
};
