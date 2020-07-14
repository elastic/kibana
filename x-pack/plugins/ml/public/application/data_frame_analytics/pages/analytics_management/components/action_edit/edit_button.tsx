/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { FC } from 'react';

import { i18n } from '@kbn/i18n';

import { EuiIcon, EuiLink, EuiToolTip } from '@elastic/eui';

import { checkPermission } from '../../../../../capabilities/check_capabilities';

interface EditButtonProps {
  onClick: () => void;
}

export const EditButton: FC<EditButtonProps> = ({ onClick }) => {
  const canCreateDataFrameAnalytics: boolean = checkPermission('canCreateDataFrameAnalytics');

  const buttonEditText = i18n.translate('xpack.ml.dataframe.analyticsList.editActionName', {
    defaultMessage: 'Edit',
  });

  const buttonDisabled = !canCreateDataFrameAnalytics;
  const editButton = (
    <EuiLink
      data-test-subj="mlAnalyticsJobEditButton"
      color={buttonDisabled ? 'subdued' : 'text'}
      disabled={buttonDisabled}
      onClick={buttonDisabled ? undefined : onClick}
      aria-label={buttonEditText}
      style={{ padding: 0 }}
    >
      <EuiIcon type="pencil" /> {buttonEditText}
    </EuiLink>
  );

  if (!canCreateDataFrameAnalytics) {
    return (
      <EuiToolTip
        position="top"
        content={i18n.translate('xpack.ml.dataframe.analyticsList.editActionPermissionTooltip', {
          defaultMessage: 'You do not have permission to edit analytics jobs.',
        })}
      >
        {editButton}
      </EuiToolTip>
    );
  }

  return editButton;
};
