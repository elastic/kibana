/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

// copied from x-pack/plugins/fleet/public/applications/fleet/components/header.tsx

import React, { memo, useCallback } from 'react';
import { EuiFlexGroup, EuiFlexItem, EuiTabs, EuiTab, EuiSpacer } from '@elastic/eui';
import type { Props as EuiTabProps } from '@elastic/eui/src/components/tabs/tab';
import type { EuiFlexItemProps } from '@elastic/eui/src/components/flex/flex_item';
import { css } from '@emotion/react';
import type { EuiThemeComputed } from '@elastic/eui/src/services/theme/types';

const containerCss = (theme: EuiThemeComputed) => ({
  borderBottom: theme.border.thin,
  backgroundColor: theme.colors.body,
});

const tabsCss = {
  top: '1px',
  '&:before': {
    height: '0px',
  },
};

export interface HeaderProps {
  children?: React.ReactNode;
  maxWidth?: number;
  leftColumn?: JSX.Element;
  rightColumn?: JSX.Element;
  rightColumnGrow?: EuiFlexItemProps['grow'];
  tabs?: Array<Omit<EuiTabProps, 'name'> & { name?: JSX.Element | string }>;
  tabsClassName?: string;
  'data-test-subj'?: string;
}

const HeaderColumns: React.FC<Omit<HeaderProps, 'tabs'>> = memo(
  ({ leftColumn, rightColumn, rightColumnGrow }) => (
    <EuiFlexGroup alignItems="center">
      {leftColumn ? <EuiFlexItem>{leftColumn}</EuiFlexItem> : null}
      {rightColumn ? <EuiFlexItem grow={rightColumnGrow}>{rightColumn}</EuiFlexItem> : null}
    </EuiFlexGroup>
  )
);

HeaderColumns.displayName = 'HeaderColumns';

const HeaderComponent: React.FC<HeaderProps> = ({
  children,
  leftColumn,
  rightColumn,
  rightColumnGrow,
  tabs,
  maxWidth,
  tabsClassName,
  'data-test-subj': dataTestSubj,
}) => {
  const wrapperCss = useCallback(
    (theme: EuiThemeComputed) => css`
      max-width: ${maxWidth || 1200}px;
      margin-left: auto;
      margin-right: auto;
      padding-top: ${theme.size.xl};
      padding-left: ${theme.size.m};
      padding-right: ${theme.size.m};
    `,

    [maxWidth]
  );

  return (
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore // TODO wait for changes in css?: Interpolation<Theme>
    <div css={containerCss} data-test-subj={dataTestSubj}>
      {/* eslint-disable-next-line @typescript-eslint/ban-ts-comment */}
      {/* @ts-ignore // TODO wait for changes in css?: Interpolation<Theme>*/}
      <div css={wrapperCss}>
        <HeaderColumns
          leftColumn={leftColumn}
          rightColumn={rightColumn}
          rightColumnGrow={rightColumnGrow}
        />
        {children}
        <EuiFlexGroup>
          {tabs ? (
            <EuiFlexItem>
              <EuiSpacer size="s" />
              <EuiTabs className={tabsClassName} css={tabsCss}>
                {tabs.map((props) => (
                  <EuiTab {...(props as EuiTabProps)} key={props.id}>
                    {props.name}
                  </EuiTab>
                ))}
              </EuiTabs>
            </EuiFlexItem>
          ) : (
            <EuiFlexItem>
              <EuiSpacer size="l" />
            </EuiFlexItem>
          )}
        </EuiFlexGroup>
      </div>
    </div>
  );
};

export const Header = React.memo(HeaderComponent);
