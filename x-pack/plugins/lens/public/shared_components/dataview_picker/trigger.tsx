/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useEuiTheme, EuiFlexGroup, EuiFlexItem, EuiToolTip, EuiTextColor } from '@elastic/eui';
import { css } from '@emotion/react';
import React from 'react';
import { ToolbarButton, ToolbarButtonProps } from './toolbar_button';

interface TriggerLabelProps {
  label: string;
  icon?: {
    component: React.ReactElement;
    value?: string;
    tooltipValue?: string;
    'data-test-subj': string;
  };
}

export type ChangeIndexPatternTriggerProps = ToolbarButtonProps &
  TriggerLabelProps & {
    label: string;
    title?: string;
    isDisabled?: boolean;
  };

function TriggerLabel({ label, icon }: TriggerLabelProps) {
  const { euiTheme } = useEuiTheme();

  if (!icon) {
    return <>{label}</>;
  }
  return (
    <EuiFlexGroup alignItems="center" gutterSize="s" responsive={false}>
      <EuiFlexItem
        className="eui-textTruncate"
        css={css`
          display: block;
          min-width: 0;
        `}
      >
        {label}
      </EuiFlexItem>
      <EuiFlexItem
        grow={false}
        data-test-subj={icon['data-test-subj']}
        css={css`
          display: block;
          *:hover &,
          *:focus & {
            text-decoration: none !important;
          }
        `}
      >
        <EuiToolTip content={icon.tooltipValue} position="top">
          <EuiFlexGroup alignItems="center" gutterSize="xs" responsive={false}>
            <EuiFlexItem grow={false}>{icon.component}</EuiFlexItem>
            {icon.value ? (
              <EuiFlexItem grow={false}>
                <EuiTextColor color={euiTheme.colors.disabledText}>{icon.value}</EuiTextColor>
              </EuiFlexItem>
            ) : null}
          </EuiFlexGroup>
        </EuiToolTip>
      </EuiFlexItem>
    </EuiFlexGroup>
  );
}

export function TriggerButton({
  label,
  title,
  togglePopover,
  isMissingCurrent,
  icon,
  ...rest
}: ChangeIndexPatternTriggerProps & {
  togglePopover: () => void;
  isMissingCurrent?: boolean;
}) {
  // be careful to only add color with a value, otherwise it will fallbacks to "primary"
  const colorProp = isMissingCurrent
    ? {
        color: 'danger' as const,
      }
    : {};
  return (
    <ToolbarButton
      title={title}
      onClick={() => togglePopover()}
      fullWidth
      {...colorProp}
      {...rest}
      textProps={{ style: { width: '100%' } }}
    >
      <TriggerLabel label={label} icon={icon} />
    </ToolbarButton>
  );
}
