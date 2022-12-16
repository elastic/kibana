/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ReactNode } from 'react';
import React, { memo, useMemo, useCallback } from 'react';
import styled from 'styled-components';
import {
  EuiText,
  EuiIcon,
  EuiSpacer,
  EuiFlexGroup,
  EuiFlexItem,
  EuiButtonIcon,
  EuiTitle,
} from '@elastic/eui';

import { FormattedMessage } from '@kbn/i18n-react';
import { CommandList } from '../command_list';
import { useWithCommandList } from '../../hooks/state_selectors/use_with_command_list';
import { SidePanelContentLayout } from './side_panel_content_layout';
import { useWithSidePanel } from '../../hooks/state_selectors/use_with_side_panel';
import { useConsoleStateDispatch } from '../../hooks/state_selectors/use_console_state_dispatch';

const StyledEuiFlexGroup = styled(EuiFlexGroup)`
  padding-top: ${({ theme: { eui } }) => eui.euiPanelPaddingModifiers.paddingSmall};
  padding-right: ${({ theme: { eui } }) => eui.euiPanelPaddingModifiers.paddingSmall};
`;

export const SidePanelContentManager = memo(() => {
  const dispatch = useConsoleStateDispatch();
  const commands = useWithCommandList();
  const show = useWithSidePanel().show;

  const closeHelpPanel = useCallback(() => {
    dispatch({
      type: 'showSidePanel',
      payload: { show: null },
    });
  }, [dispatch]);

  const panelHeader: ReactNode = useMemo(() => {
    if (show === 'help') {
      return (
        <>
          <StyledEuiFlexGroup>
            <EuiFlexItem>
              <EuiTitle size="s">
                <h3>
                  <FormattedMessage
                    id="xpack.securitySolution.console.sidePanel.helpTitle"
                    defaultMessage="Help"
                  />
                </h3>
              </EuiTitle>
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <EuiButtonIcon
                aria-label="closeSidePanelIcon"
                iconType="cross"
                color="text"
                onClick={closeHelpPanel}
              />
            </EuiFlexItem>
          </StyledEuiFlexGroup>
          <EuiSpacer size="m" />
          <EuiText size="s">
            <FormattedMessage
              id="xpack.securitySolution.console.sidePanel.helpDescription"
              defaultMessage="Use the add ({icon}) button to populate a response action to the text bar. Add additional parameters or comments as necessary."
              values={{
                icon: <EuiIcon type="plusInCircle" />,
              }}
            />
          </EuiText>
        </>
      );
    }
    return null;
  }, [show, closeHelpPanel]);

  const panelBody: ReactNode = useMemo(() => {
    if (show === 'help') {
      return <CommandList commands={commands} display="table" />;
    }

    return null;
  }, [commands, show]);

  if (!show) {
    return null;
  }

  return <SidePanelContentLayout headerContent={panelHeader}>{panelBody}</SidePanelContentLayout>;
});
SidePanelContentManager.displayName = 'RightPanelContentManager';
