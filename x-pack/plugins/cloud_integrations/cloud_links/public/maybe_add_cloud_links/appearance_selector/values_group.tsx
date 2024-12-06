/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiIcon,
  EuiText,
  type EuiThemeComputed,
  useEuiTheme,
  EuiKeyPadMenuItem,
} from '@elastic/eui';

import { css } from '@emotion/react';

export interface Value<T> {
  label: string;
  id: T;
  icon: string;
  betaBadgeLabel?: string;
  betaBadgeTooltipContent?: string;
  betaBadgeIconType?: string;
}

const getStyles = ({ euiTheme }: { euiTheme: EuiThemeComputed }) => ({
  title: css`
    font-weight: 600;
  `,
  group: css`
    padding-top: ${euiTheme.size.s};
  `,
});

interface Props<T> {
  title: string;
  values: Array<Value<T>>;
  selectedValue: T;
  onChange: (id: T) => void;
}

export function ValuesGroup<T extends string = string>({
  title,
  values,
  onChange,
  selectedValue,
}: Props<T>) {
  const { euiTheme } = useEuiTheme();
  const styles = getStyles({ euiTheme });

  return (
    <>
      <EuiText size="xs" css={styles.title}>
        {title}
      </EuiText>

      <EuiFlexGroup css={styles.group} gutterSize="s">
        {values.map(
          ({ id, label, icon, betaBadgeIconType, betaBadgeLabel, betaBadgeTooltipContent }) => (
            <EuiFlexItem key={id} grow={false}>
              <EuiKeyPadMenuItem
                key={id}
                label={label}
                isSelected={selectedValue === id}
                onClick={() => {
                  onChange(id);
                }}
                betaBadgeLabel={betaBadgeLabel}
                betaBadgeTooltipContent={betaBadgeTooltipContent}
                betaBadgeIconType={betaBadgeIconType}
              >
                <EuiIcon type={icon} size="l" />
              </EuiKeyPadMenuItem>
            </EuiFlexItem>
          )
        )}
      </EuiFlexGroup>
    </>
  );
}
