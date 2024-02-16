/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { FC } from 'react';
import { EuiButton } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { createPermissionFailureMessage } from '../../../../../capabilities/check_capabilities';
import { CreateAnalyticsButtonWrapper } from '../../../analytics_creation/components/create_analytics_button_wrapper';
import { useHasRequiredIndicesPermissions } from '../../../analytics_creation/hooks';

const createPermissionMessage = createPermissionFailureMessage('canCreateDataFrameAnalytics');

interface Props {
  isDisabled: boolean;
  navigateToSourceSelection: () => void;
}

export const CreateAnalyticsButton: FC<Props> = ({ isDisabled, navigateToSourceSelection }) => {
  const handleClick = () => {
    navigateToSourceSelection();
  };

  const hasRequiredIndicesPermissions = useHasRequiredIndicesPermissions();

  return (
    <CreateAnalyticsButtonWrapper
      disabled={isDisabled || !hasRequiredIndicesPermissions}
      tooltipContent={!hasRequiredIndicesPermissions ? undefined : createPermissionMessage}
    >
      <EuiButton
        disabled={isDisabled || !hasRequiredIndicesPermissions}
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
    </CreateAnalyticsButtonWrapper>
  );
};
