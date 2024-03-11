/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import {
  EuiTitle,
  EuiSpacer,
  EuiFlexItem,
  EuiFlexGroup,
  EuiTabs,
  EuiTab,
  useEuiTheme,
  useEuiMinBreakpoint,
  type EuiPageHeaderProps,
} from '@elastic/eui';
import { css } from '@emotion/react';
type Props = Pick<EuiPageHeaderProps, 'tabs' | 'title' | 'rightSideItems'>;

export const FlyoutHeader = ({ title, tabs = [], rightSideItems = [] }: Props) => {
  const { euiTheme } = useEuiTheme();

  return (
    <>
      <EuiFlexGroup gutterSize="m" justifyContent="spaceBetween" direction="row">
        <EuiFlexItem
          grow
          css={css`
            overflow: hidden;
            & h4 {
              text-overflow: ellipsis;
              overflow: hidden;
              white-space: nowrap;
              width: calc(100%);
            }
          `}
        >
          <EuiTitle size="xs">
            <h4>{title}</h4>
          </EuiTitle>
        </EuiFlexItem>
        <EuiFlexItem
          grow={false}
          css={css`
            align-items: flex-start;
            ${useEuiMinBreakpoint('m')} {
              align-items: flex-end;
            }
          `}
        >
          <EuiFlexGroup
            gutterSize="m"
            responsive={false}
            justifyContent="flexEnd"
            alignItems="center"
            css={css`
              margin-right: ${euiTheme.size.l};
            `}
          >
            {rightSideItems?.map((item, index) => (
              <EuiFlexItem key={index} grow={false}>
                {item}
              </EuiFlexItem>
            ))}
          </EuiFlexGroup>
        </EuiFlexItem>
      </EuiFlexGroup>
      <EuiSpacer size="s" />
      <EuiTabs
        bottomBorder
        css={css`
          margin-bottom: calc(-1 * (${euiTheme.size.l} + 1px));
        `}
        size="s"
      >
        {tabs.map(({ label, ...tab }, index) => (
          <EuiTab key={index} {...tab}>
            {label}
          </EuiTab>
        ))}
      </EuiTabs>
    </>
  );
};
