/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo, useCallback } from 'react';
import { EuiButtonIcon, EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import { useConsoleStateDispatch } from '../hooks/state_selectors/use_console_state_dispatch';
import { useWithSidePanel } from '../hooks/state_selectors/use_with_side_panel';
import { ConsoleProps } from '..';

export type ConsoleHeaderProps = Pick<ConsoleProps, 'TitleComponent'>;

export const ConsoleHeader = memo<ConsoleHeaderProps>(({ TitleComponent }) => {
  const dispatch = useConsoleStateDispatch();
  const panelCurrentlyShowing = useWithSidePanel().show;

  const handleHelpButtonOnClick = useCallback(() => {
    dispatch({
      type: 'showSidePanel',
      payload: { show: panelCurrentlyShowing === 'help' ? null : 'help' },
    });
  }, [dispatch, panelCurrentlyShowing]);

  return (
    <EuiFlexGroup gutterSize="none" alignItems="center">
      <EuiFlexItem grow>{TitleComponent ? <TitleComponent /> : ''}</EuiFlexItem>
      <EuiFlexItem grow={false}>
        <EuiButtonIcon
          onClick={handleHelpButtonOnClick}
          iconType={'help'}
          aria-label="show help"
          isSelected={Boolean(panelCurrentlyShowing)}
          display={panelCurrentlyShowing === 'help' ? 'fill' : 'empty'}
        />
      </EuiFlexItem>
    </EuiFlexGroup>
  );
});
ConsoleHeader.displayName = 'ConsoleHeader';
