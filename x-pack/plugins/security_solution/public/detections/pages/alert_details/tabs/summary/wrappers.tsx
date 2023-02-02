/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiFlexGroup, EuiFlexItem, EuiPanel, EuiSpacer, EuiText, EuiTitle } from '@elastic/eui';
import type { EuiFlexItemProps } from '@elastic/eui';
import { css } from '@emotion/react';
import { HoverVisibilityContainer } from '../../../../../common/components/hover_visibility_container';

export const SummaryColumn: React.FC<{ grow?: EuiFlexItemProps['grow'] }> = ({
  children,
  grow,
}) => (
  <EuiFlexItem grow={grow}>
    <EuiFlexGroup
      direction="column"
      wrap={false}
      css={css`
        flex-wrap: nowrap;
      `}
    >
      {children}
    </EuiFlexGroup>
  </EuiFlexItem>
);

export const SummaryRow: React.FC<{ grow?: EuiFlexItemProps['grow'] }> = ({ children, grow }) => (
  <EuiFlexItem grow={grow}>
    <EuiFlexGroup direction="row" wrap>
      {children}
    </EuiFlexGroup>
  </EuiFlexItem>
);

export const SummaryPanel: React.FC<{
  grow?: EuiFlexItemProps['grow'];
  title: string;
  description?: string;
  actionsClassName?: string;
  renderActionsPopover?: () => JSX.Element;
}> = ({ actionsClassName, children, description, grow = false, renderActionsPopover, title }) => (
  <EuiFlexItem grow={grow}>
    <EuiPanel hasShadow={false} hasBorder>
      <HoverVisibilityContainer targetClassNames={[actionsClassName ?? '']}>
        <EuiFlexGroup direction="row" justifyContent="spaceBetween">
          <EuiFlexItem>
            <EuiTitle size="s">
              <h3>{title}</h3>
            </EuiTitle>
            <EuiSpacer size="xs" />
            {description && (
              <EuiText color="subdued" size="xs">
                <p>{description}</p>
              </EuiText>
            )}
          </EuiFlexItem>
          {actionsClassName && renderActionsPopover ? (
            <EuiFlexItem grow={false}>{renderActionsPopover()}</EuiFlexItem>
          ) : null}
        </EuiFlexGroup>
      </HoverVisibilityContainer>
      <EuiSpacer size="l" />
      {children}
    </EuiPanel>
  </EuiFlexItem>
);
