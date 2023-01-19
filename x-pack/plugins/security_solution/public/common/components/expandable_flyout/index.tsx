/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo } from 'react';
import { css } from '@emotion/react';
import type { EuiFlyoutProps } from '@elastic/eui';
import { EuiFlexGroup, EuiFlyout } from '@elastic/eui';
import { PreviewSection } from './preview_section';
import { RightSection } from './right_section';
import { useExpandableFlyoutContext } from '../../../flyout/context';
import type { SecurityFlyoutPanel } from '../../store/flyout/model';
import { LeftSection } from './left_section';

export interface ExpandableFlyoutPanel {
  /**
   * Unique key used to identify the panel
   */
  key?: string;
  /**
   * Component to be rendered
   */
  component: (props: SecurityFlyoutPanel) => React.ReactElement; // TODO: generalize SecurityFlyoutPanel to allow it to work in any solution
  /**
   * Width used when rendering the panel
   */
  width: number; // TODO remove this, the width shouldn't be a property of a panel, but handled at the flyout level
}

export interface ExpandableFlyoutProps extends EuiFlyoutProps {
  /**
   * List of panels available for render
   */
  panels: ExpandableFlyoutPanel[];
}

export const ExpandableFlyout: React.FC<ExpandableFlyoutProps> = ({ panels, ...flyoutProps }) => {
  const context = useExpandableFlyoutContext();
  const { left, right, preview: previewPanels } = context.panels;

  const leftSection = useMemo(() => panels.find((panel) => panel.key === left?.id), [left, panels]);

  const rightSection = useMemo(
    () => panels.find((panel) => panel.key === right?.id),
    [right, panels]
  );

  // retrieve the last preview panel (most recent)
  const preview = previewPanels ? previewPanels[previewPanels.length - 1] : undefined;
  const showBackButton = previewPanels.length > 1;
  const previewSection = useMemo(
    () => panels.find((panel) => panel.key === preview?.id),
    [preview, panels]
  );

  const width: number = (leftSection?.width ?? 0) + (rightSection?.width ?? 0);

  return (
    <EuiFlyout
      css={css`
        overflow-y: scroll;
      `}
      {...flyoutProps}
      size={width}
      ownFocus={false}
    >
      <EuiFlexGroup
        direction={leftSection ? 'row' : 'column'}
        wrap={false}
        gutterSize="none"
        style={{ height: '100%' }}
      >
        {leftSection && left ? (
          <LeftSection component={leftSection.component({ ...left })} width={leftSection.width} />
        ) : null}
        {rightSection && right ? (
          <RightSection
            component={rightSection.component({ ...right })}
            width={rightSection.width}
          />
        ) : null}
      </EuiFlexGroup>

      {previewSection && preview ? (
        <PreviewSection
          component={previewSection.component({ ...preview })}
          showBackButton={showBackButton}
          width={leftSection?.width}
        />
      ) : null}
    </EuiFlyout>
  );
};
