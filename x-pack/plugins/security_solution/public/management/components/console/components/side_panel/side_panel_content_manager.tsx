/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo, ReactNode, useMemo, useCallback } from 'react';
import {
  EuiText,
  EuiIcon,
  EuiSpacer,
  EuiFlexGroup,
  EuiFlexItem,
  EuiButtonIcon,
} from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import { CommandList } from '../command_list';
import { useWithCommandList } from '../../hooks/state_selectors/use_with_command_list';
import { SidePanelContentLayout } from './side_panel_content_layout';
import { useWithSidePanel } from '../../hooks/state_selectors/use_with_side_panel';
import { useConsoleStateDispatch } from '../../hooks/state_selectors/use_console_state_dispatch';

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
          <EuiFlexGroup>
            <EuiFlexItem>
              <EuiText size="m">
                <strong>
                  <FormattedMessage
                    id="xpack.securitySolution.console.sidePanel.helpTitle"
                    defaultMessage="Help"
                  />
                </strong>
              </EuiText>
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <EuiButtonIcon
                aria-label="closeSidePanelIcon"
                iconType="cross"
                color="text"
                onClick={closeHelpPanel}
              />
            </EuiFlexItem>
          </EuiFlexGroup>
          <EuiSpacer size="xs" />
          <EuiText size="s">
            <FormattedMessage
              id="xpack.securitySolution.console.sidePanel.helpDescription"
              defaultMessage="To execute response actions add to main text bar ({icon}) use a comment or a parameter if necessary."
              values={{ icon: <EuiIcon type="plusInCircle" /> }}
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
