/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { FC } from 'react';

import { i18n } from '@kbn/i18n';

import { EuiButtonEmpty, EuiToolTip } from '@elastic/eui';

const buttonText = i18n.translate('xpack.ml.dataframe.analyticsList.editActionName', {
  defaultMessage: 'Edit',
});

interface EditButtonProps {
  isDisabled: boolean;
  onClick: () => void;
}

export const EditButton: FC<EditButtonProps> = ({ isDisabled, onClick }) => {
  const button = (
    <EuiButtonEmpty
      aria-label={buttonText}
      color="text"
      data-test-subj="mlAnalyticsJobEditButton"
      flush="left"
      iconType="pencil"
      isDisabled={isDisabled}
      onClick={onClick}
      size="s"
    >
      {buttonText}
    </EuiButtonEmpty>
  );

  if (isDisabled) {
    return (
      <EuiToolTip
        position="top"
        content={i18n.translate('xpack.ml.dataframe.analyticsList.editActionPermissionTooltip', {
          defaultMessage: 'You do not have permission to edit analytics jobs.',
        })}
      >
        {button}
      </EuiToolTip>
    );
  }

  return button;
};
