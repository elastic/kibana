/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { FC } from 'react';

import { i18n } from '@kbn/i18n';

import { EuiToolTip } from '@elastic/eui';

export const editActionNameText = i18n.translate(
  'xpack.ml.dataframe.analyticsList.editActionNameText',
  {
    defaultMessage: 'Edit',
  }
);

interface EditActionNameProps {
  isDisabled: boolean;
}

export const EditActionName: FC<EditActionNameProps> = ({ isDisabled }) => {
  if (isDisabled) {
    return (
      <EuiToolTip
        position="top"
        content={i18n.translate('xpack.ml.dataframe.analyticsList.editActionPermissionTooltip', {
          defaultMessage: 'You do not have permission to edit analytics jobs.',
        })}
      >
        <>{editActionNameText}</>
      </EuiToolTip>
    );
  }

  return <>{editActionNameText}</>;
};
