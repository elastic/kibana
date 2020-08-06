/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { FC } from 'react';

import { i18n } from '@kbn/i18n';

import { EuiToolTip } from '@elastic/eui';

export const editActionButtonText = i18n.translate(
  'xpack.ml.dataframe.analyticsList.editActionName',
  {
    defaultMessage: 'Edit',
  }
);

interface EditButtonProps {
  isDisabled: boolean;
}

export const EditButton: FC<EditButtonProps> = ({ isDisabled }) => {
  if (isDisabled) {
    return (
      <EuiToolTip
        position="top"
        content={i18n.translate('xpack.ml.dataframe.analyticsList.editActionPermissionTooltip', {
          defaultMessage: 'You do not have permission to edit analytics jobs.',
        })}
      >
        <>{editActionButtonText}</>
      </EuiToolTip>
    );
  }

  return <>{editActionButtonText}</>;
};
