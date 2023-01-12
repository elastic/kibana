/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo } from 'react';
import type { EuiFlyoutProps } from '@elastic/eui';
import { EuiFlexGroup, EuiFlexItem, EuiFlyout } from '@elastic/eui';
import { css } from '@emotion/react';
import { useExpandableFlyoutContext } from '../../../flyout/context';
import type { SecurityFlyoutPanel } from '../../store/flyout/model';

// The expandable flyout should only worry about visual information and rendering components based on the ID provided.
// This *should* be able to be exported to a package
export interface ExpandableFlyoutViews {
  panelKind?: string;
  component: (props: SecurityFlyoutPanel) => React.ReactElement; // TODO: genericize SecurityFlyoutPanel to allow it to work in any solution
  size: number;
}

export interface ExpandableFlyoutProps extends EuiFlyoutProps {
  panels: ExpandableFlyoutViews[];
}

export const ExpandableFlyout: React.FC<ExpandableFlyoutProps> = ({ panels, ...flyoutProps }) => {
  const { flyoutPanels } = useExpandableFlyoutContext();
  const { left, right, preview } = flyoutPanels;

  const leftSection = useMemo(
    () => panels.find((panel) => panel.panelKind === left?.panelKind),
    [left, panels]
  );

  const rightSection = useMemo(
    () => panels.find((panel) => panel.panelKind === right?.panelKind),
    [right, panels]
  );

  // const previewSection = useMemo(
  //   () => panels.find((panel) => panel.panelKind === preview?.panelKind),
  //   [preview, panels]
  // );

  const flyoutSize = (leftSection?.size ?? 0) + (rightSection?.size ?? 0);
  return (
    <EuiFlyout
      css={css`
        overflow-y: scroll;
      `}
      {...flyoutProps}
      size={flyoutSize}
      ownFocus={false}
    >
      <EuiFlexGroup
        direction={leftSection ? 'row' : 'column'}
        wrap={false}
        style={{ height: '100%' }}
      >
        {leftSection && left ? (
          <EuiFlexItem grow>
            <EuiFlexGroup direction="column" style={{ maxWidth: leftSection.size, width: 'auto' }}>
              {leftSection.component({ ...left })}
            </EuiFlexGroup>
          </EuiFlexItem>
        ) : null}
        {rightSection && right ? (
          <EuiFlexItem grow={false} style={{ height: '100%', borderLeft: '1px solid #ccc' }}>
            <EuiFlexGroup direction="column" style={{ width: rightSection.size }}>
              {rightSection.component({ ...right })}
            </EuiFlexGroup>
          </EuiFlexItem>
        ) : null}
      </EuiFlexGroup>
    </EuiFlyout>
  );
};
