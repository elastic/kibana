/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiFlexGroup,
  EuiFlexGroupProps,
  EuiFlexItem,
  EuiHorizontalRule,
  EuiIcon,
} from '@elastic/eui';
import { css, SerializedStyles } from '@emotion/react';
import { euiThemeVars } from '@kbn/ui-theme';
import React, { CSSProperties, MouseEventHandler } from 'react';
import { itemRuleStyle, tabContentHeight } from '../shared_styles';

type SelectorListProps = React.HTMLAttributes<HTMLElement>;

export function SelectorList(props: SelectorListProps) {
  return <div className="eui-yScroll" css={panelStyle} {...props} />;
}

SelectorList.Row = Row;
SelectorList.Header = Header;
SelectorList.Column = Column;
SelectorList.SortableColumn = SortableColumn;

export interface SelectorRowProps extends EuiFlexGroupProps {
  css?: SerializedStyles;
  disabled?: boolean;
  withIndentation?: boolean;
}

function Row({
  css: customCss,
  disabled = false,
  withIndentation = false,
  ...props
}: SelectorRowProps) {
  const styles = css`
    padding-right: ${euiThemeVars.euiSizeM};
    ${itemRuleStyle}
    ${disabled ? disabledStyle : ''}
    ${withIndentation ? indentationStyle : ''}
    ${customCss}
  `;

  return (
    <EuiFlexGroup gutterSize="s" alignItems="center" responsive={false} css={styles} {...props} />
  );
}

function Header(props: SelectorRowProps) {
  return (
    <div css={headerStyle}>
      <SelectorList.Row {...props} />
      <EuiHorizontalRule margin="none" />
    </div>
  );
}

export interface SelectorColumnProps extends React.ComponentProps<typeof EuiFlexItem> {
  css?: SerializedStyles;
  sidePadding?: CSSProperties['padding'];
  onClick?: MouseEventHandler<HTMLElement>;
}

function Column({
  css: customCss,
  sidePadding = euiThemeVars.euiSizeS,
  ...props
}: SelectorColumnProps) {
  const styles = css`
    padding: ${euiThemeVars.euiSizeS} ${sidePadding};
    ${props.onClick ? interactiveStyle : ''}
    ${customCss}
  `;

  return <EuiFlexItem css={styles} {...props} />;
}

export type SortOrder = 'asc' | 'desc';
interface SortableProps extends React.HTMLAttributes<HTMLButtonElement> {
  sortOrder: SortOrder;
  onSort: (order: SortOrder) => void;
}

function SortableColumn({ children, sortOrder = 'asc', onSort, ...props }: SortableProps) {
  const isAscending = sortOrder === 'asc';

  const handleSort = () => {
    onSort(isAscending ? 'desc' : 'asc');
  };

  // TODO: refactor to <EuiFlexGroup component="button" /> as soon as is supported by EUI
  return (
    <Column {...props} component="button" onClick={handleSort}>
      <EuiFlexGroup gutterSize="xs" alignItems="center" responsive={false}>
        {children}
        <EuiIcon type={isAscending ? 'sortUp' : 'sortDown'} size="m" />
      </EuiFlexGroup>
    </Column>
  );
}

const panelStyle = css`
  ${tabContentHeight}
`;

const headerStyle = css`
  position: sticky;
  top: 0;
  background-color: ${euiThemeVars.euiColorEmptyShade};
  z-index: ${euiThemeVars.euiZHeader};
`;

const disabledStyle = css`
  color: ${euiThemeVars.euiColorDisabledText};
  cursor: not-allowed;
  pointer-events: none;
`;

const indentationStyle = css`
  padding-left: ${euiThemeVars.euiSizeL};
  margin-inline-start: ${euiThemeVars.euiSizeXS};
`;

const interactiveStyle = css`
  &:hover {
    cursor: pointer;
    text-decoration: underline;
  }
`;
