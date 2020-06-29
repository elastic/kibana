/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiFlexGroup, EuiFlexItem, EuiButtonEmpty } from '@elastic/eui';
import React, { ReactNode } from 'react';
import { withTheme, EuiTheme } from '../../../../../../observability/public';

interface Props {
  label: string;
  onClick: () => void;
  theme: EuiTheme | undefined;
  children: ReactNode;
}

export const DropdownButton = withTheme(({ onClick, label, theme, children }: Props) => {
  return (
    <EuiFlexGroup
      alignItems="center"
      gutterSize="none"
      style={{
        border: theme?.eui.euiFormInputGroupBorder,
        boxShadow: `0px 3px 2px ${theme?.eui.euiTableActionsBorderColor}, 0px 1px 1px ${theme?.eui.euiTableActionsBorderColor}`,
      }}
    >
      <EuiFlexItem
        grow={false}
        style={{
          padding: 12,
          background: theme?.eui.euiFormInputGroupLabelBackground,
          fontSize: '0.75em',
          fontWeight: 600,
          color: theme?.eui.euiTitleColor,
        }}
      >
        {label}
      </EuiFlexItem>
      <EuiFlexItem grow={false}>
        <EuiButtonEmpty
          color="text"
          iconType="arrowDown"
          onClick={onClick}
          iconSide="right"
          size="xs"
        >
          {children}
        </EuiButtonEmpty>
      </EuiFlexItem>
    </EuiFlexGroup>
  );
});
