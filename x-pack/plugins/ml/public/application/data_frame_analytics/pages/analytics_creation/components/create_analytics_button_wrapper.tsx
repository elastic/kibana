/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { FC } from 'react';
import { EuiToolTip } from '@elastic/eui';
import { i18n } from '@kbn/i18n';

const indicesPermissionMessage = i18n.translate(
  'xpack.ml.dataFrame.analyticsList.disabledCreationTooltipText',
  {
    defaultMessage:
      'Analytics creation requires permission to create, start, and stop analytics as well as creation and management permissions for indices.',
  }
);

export const CreateAnalyticsButtonWrapper: FC<{
  children: any;
  disabled: boolean;
  tooltipContent?: string;
}> = ({ children, disabled, tooltipContent }) => {
  if (!disabled) {
    return <>{children}</>;
  }

  return (
    <EuiToolTip content={tooltipContent ?? indicesPermissionMessage}>
      <>{children}</>
    </EuiToolTip>
  );
};
