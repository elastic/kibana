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
} from '@elastic/eui';
import classNames from 'classnames';

import { css } from '@emotion/react';

export interface Value<T> {
  label: string;
  id: T;
  icon: string;
}

const getStyles = ({ euiTheme }: { euiTheme: EuiThemeComputed }) => ({
  title: css`
    font-weight: 600;
  `,
  group: css`
    padding-top: ${euiTheme.size.s};
  `,
  item: css`
    border: 1px solid transparent;
    border-radius: ${euiTheme.border.radius.medium};
    padding: ${euiTheme.size.m};
    min-width: 100px;

    &.valueItem--selected {
      background-color: ${euiTheme.colors.backgroundLightPrimary};
    }

    &:hover {
      border-color: ${euiTheme.colors.backgroundLightPrimary};
    }
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
        {values.map(({ id, label, icon }) => (
          <button
            onClick={() => {
              onChange(id);
            }}
          >
            <EuiFlexItem
              key={id}
              grow={false}
              css={styles.item}
              className={classNames('valueItem', styles.item, {
                'valueItem--selected': selectedValue === id,
              })}
            >
              <EuiFlexGroup direction="column" alignItems="center">
                <EuiFlexItem>
                  <EuiIcon type={icon} size="l" />
                </EuiFlexItem>
                <EuiFlexItem>
                  <EuiText size="xs">{label}</EuiText>
                </EuiFlexItem>
              </EuiFlexGroup>
            </EuiFlexItem>
          </button>
        ))}
      </EuiFlexGroup>
    </>
  );
}
