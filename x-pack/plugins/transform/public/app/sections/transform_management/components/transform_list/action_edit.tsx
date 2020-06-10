/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { useContext, useState, FC } from 'react';

import { i18n } from '@kbn/i18n';

import { EuiButtonEmpty, EuiToolTip } from '@elastic/eui';

import { TransformPivotConfig } from '../../../../common';
import {
  createCapabilityFailureMessage,
  AuthorizationContext,
} from '../../../../lib/authorization';

import { EditTransformFlyout } from '../edit_transform_flyout';

interface EditActionProps {
  config: TransformPivotConfig;
}

export const EditAction: FC<EditActionProps> = ({ config }) => {
  const { canCreateTransform } = useContext(AuthorizationContext).capabilities;

  const [isFlyoutVisible, setIsFlyoutVisible] = useState(false);
  const closeFlyout = () => setIsFlyoutVisible(false);
  const showFlyout = () => setIsFlyoutVisible(true);

  const buttonEditText = i18n.translate('xpack.transform.transformList.editActionName', {
    defaultMessage: 'Edit',
  });

  const editButton = (
    <EuiButtonEmpty
      size="xs"
      color="text"
      disabled={!canCreateTransform}
      iconType="copy"
      onClick={showFlyout}
      aria-label={buttonEditText}
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

  return (
    <>
      {editButton}
      {isFlyoutVisible && <EditTransformFlyout closeFlyout={closeFlyout} config={config} />}
    </>
  );
};
