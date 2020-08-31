/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { FC } from 'react';
import { i18n } from '@kbn/i18n';
import { EuiToolTip } from '@elastic/eui';
import { TRANSFORM_STATE } from '../../../../../../common';
import { createCapabilityFailureMessage } from '../../../../lib/authorization';
import { TransformListRow } from '../../../../common';

export const deleteActionNameText = i18n.translate(
  'xpack.transform.transformList.deleteActionNameText',
  {
    defaultMessage: 'Delete',
  }
);

const transformCanNotBeDeleted = (item: TransformListRow) =>
  ![TRANSFORM_STATE.STOPPED, TRANSFORM_STATE.FAILED].includes(item.stats.state);

export const isDeleteActionDisabled = (items: TransformListRow[], forceDisable: boolean) => {
  const disabled = items.some(transformCanNotBeDeleted);
  return forceDisable === true || disabled;
};

export interface DeleteActionNameProps {
  canDeleteTransform: boolean;
  disabled: boolean;
  isBulkAction: boolean;
}

export const DeleteActionName: FC<DeleteActionNameProps> = ({
  canDeleteTransform,
  disabled,
  isBulkAction,
}) => {
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

  if (disabled || !canDeleteTransform) {
    let content;
    if (disabled) {
      content = isBulkAction ? bulkDeleteButtonDisabledText : deleteButtonDisabledText;
    } else {
      content = createCapabilityFailureMessage('canDeleteTransform');
    }

    return (
      <EuiToolTip position="top" content={content}>
        <>{deleteActionNameText}</>
      </EuiToolTip>
    );
  }

  return <>{deleteActionNameText}</>;
};
