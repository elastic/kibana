/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo, useCallback, useState } from 'react';
import styled from 'styled-components';
import {
  EuiButton,
  EuiContextMenuItem,
  EuiContextMenuPanel,
  EuiPanel,
  EuiPopover,
} from '@elastic/eui';
import { useRunningConsoleManagement } from './running_console_magenement_provider';

const RunningConsolesContainer = styled(EuiPanel)`
  position: fixed;
  bottom: 1em;
  left: 45vw;
  z-index: ${({ theme }) => theme.eui.euiZLevel5};
`;

export const RunningConsoles = memo(() => {
  const [isPopoverOpen, setIsPopoverOpen] = useState(false);
  const { consoleList } = useRunningConsoleManagement();

  const consoleCount = consoleList.length;

  const handleButtonClick = useCallback(() => {
    setIsPopoverOpen((prevState) => {
      return !prevState;
    });
  }, []);

  const handlePopoverClose = useCallback(() => {
    setIsPopoverOpen(false);
  }, []);

  return consoleCount ? (
    <RunningConsolesContainer
      paddingSize="none"
      hasBorder={false}
      hasShadow={false}
      data-test-subj="running-endpoint-consoles"
    >
      <EuiPopover
        id="singlePanel"
        button={
          <EuiButton size="s" iconType="console" iconSide="left" onClick={handleButtonClick}>
            {`${consoleCount} endpoint live console(s)`}
          </EuiButton>
        }
        isOpen={isPopoverOpen}
        closePopover={handlePopoverClose}
        panelPaddingSize="none"
        anchorPosition="downLeft"
      >
        <EuiContextMenuPanel
          size="m"
          items={consoleList.map(({ id, title, show }) => {
            return (
              <EuiContextMenuItem
                key={id}
                icon="console"
                size="m"
                onClick={() => {
                  handlePopoverClose();
                  show();
                }}
              >
                {title}
              </EuiContextMenuItem>
            );
          })}
        />
      </EuiPopover>
    </RunningConsolesContainer>
  ) : null;
});

RunningConsoles.displayName = 'RunningConsoles';
