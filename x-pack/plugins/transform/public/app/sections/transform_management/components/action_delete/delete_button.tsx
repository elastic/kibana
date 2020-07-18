/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { FC, useContext } from 'react';
import { i18n } from '@kbn/i18n';
import { EuiButtonEmpty, EuiToolTip } from '@elastic/eui';
import { TRANSFORM_STATE } from '../../../../../../common';
import {
  AuthorizationContext,
  createCapabilityFailureMessage,
} from '../../../../lib/authorization';
import { TransformListRow } from '../../../../common';

interface DeleteButtonProps {
  items: TransformListRow[];
  forceDisable?: boolean;
  onClick: (items: TransformListRow[]) => void;
}

const transformCanNotBeDeleted = (i: TransformListRow) =>
  ![TRANSFORM_STATE.STOPPED, TRANSFORM_STATE.FAILED].includes(i.stats.state);

export const DeleteButton: FC<DeleteButtonProps> = ({ items, forceDisable, onClick }) => {
  const isBulkAction = items.length > 1;

  const disabled = items.some(transformCanNotBeDeleted);
  const { canDeleteTransform } = useContext(AuthorizationContext).capabilities;

  const buttonText = i18n.translate('xpack.transform.transformList.deleteActionName', {
    defaultMessage: 'Delete',
  });
  const bulkDeleteButtonDisabledText = i18n.translate(
    'xpack.transform.transformList.deleteBulkActionDisabledToolTipContent',
    {
      defaultMessage: 'One or more selected transforms must be stopped in order to be deleted.',
    }
  );
  const deleteButtonDisabledText = i18n.translate(
    'xpack.transform.transformList.deleteActionDisabledToolTipContent',
    {
      defaultMessage: 'Stop the transform in order to delete it.',
    }
  );

  const buttonDisabled = forceDisable === true || disabled || !canDeleteTransform;

  const button = (
    <EuiButtonEmpty
      aria-label={buttonText}
      color="text"
      data-test-subj="transformActionDelete"
      flush="left"
      iconType="trash"
      isDisabled={buttonDisabled}
      onClick={() => onClick(items)}
      size="s"
    >
      {buttonText}
    </EuiButtonEmpty>
  );

  if (disabled || !canDeleteTransform) {
    let content;
    if (disabled) {
      content = isBulkAction ? bulkDeleteButtonDisabledText : deleteButtonDisabledText;
    } else {
      content = createCapabilityFailureMessage('canDeleteTransform');
    }

    return (
      <EuiToolTip position="top" content={content}>
        {button}
      </EuiToolTip>
    );
  }

  return button;
};
