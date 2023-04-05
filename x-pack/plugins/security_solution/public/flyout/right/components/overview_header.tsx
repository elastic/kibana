/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo } from 'react';
import { EuiAccordion, EuiTitle, EuiTextColor, useEuiTheme } from '@elastic/eui';

export interface OverviewHeaderProps {
  title: string;
  disabled?: boolean;
  expanded?: boolean;
  children?: React.ReactNode;
}

export const OverviewHeader: React.FC<OverviewHeaderProps> = ({
  title,
  disabled = false,
  expanded = false,
  children,
}) => {
  const { euiTheme } = useEuiTheme();
  const isDisabled = useMemo(() => disabled || !children, [disabled, children]);
  return (
    <EuiAccordion
      initialIsOpen={expanded}
      isDisabled={isDisabled}
      id={title}
      paddingSize="m"
      buttonContent={
        <EuiTitle size="xs">
          <h5>
            <EuiTextColor color={isDisabled ? euiTheme.colors.disabled : 'default'}>
              {title}
            </EuiTextColor>
          </h5>
        </EuiTitle>
      }
    >
      {children}
    </EuiAccordion>
  );
};

OverviewHeader.displayName = 'OverviewHeader';
