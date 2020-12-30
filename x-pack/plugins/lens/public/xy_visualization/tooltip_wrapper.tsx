/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { EuiToolTip } from '@elastic/eui';

export interface TooltipWrapperProps {
  tooltipContent: string;
  condition: boolean;
}

export const TooltipWrapper: React.FunctionComponent<TooltipWrapperProps> = ({
  children,
  condition,
  tooltipContent,
}) => {
  return (
    <>
      {condition ? (
        <EuiToolTip content={tooltipContent} delay="long">
          <>{children}</>
        </EuiToolTip>
      ) : (
        children
      )}
    </>
  );
};
