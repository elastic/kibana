/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { FC } from 'react';
import { EuiButton, EuiToolTip } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { createPermissionFailureMessage } from '../../../../../capabilities/check_capabilities';

interface Props {
  isDisabled: boolean;
  setIsSourceIndexModalVisible: React.Dispatch<React.SetStateAction<any>>;
}

export const CreateAnalyticsButton: FC<Props> = ({ isDisabled, setIsSourceIndexModalVisible }) => {
  const handleClick = () => {
    setIsSourceIndexModalVisible(true);
  };

  const button = (
    <EuiButton
      disabled={isDisabled}
      fill
      onClick={handleClick}
      iconType="plusInCircle"
      size="s"
      data-test-subj="mlAnalyticsButtonCreate"
    >
      {i18n.translate('xpack.ml.dataframe.analyticsList.createDataFrameAnalyticsButton', {
        defaultMessage: 'Create job',
      })}
    </EuiButton>
  );

  if (isDisabled) {
    return (
      <EuiToolTip
        position="top"
        content={createPermissionFailureMessage('canCreateDataFrameAnalytics')}
      >
        {button}
      </EuiToolTip>
    );
  }

  return button;
};
