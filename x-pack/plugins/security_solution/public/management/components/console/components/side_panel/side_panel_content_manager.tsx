/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo, ReactNode, useMemo } from 'react';
import { EuiText } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import { CommandList } from '../command_list';
import { useWithCommandList } from '../../hooks/state_selectors/use_with_command_list';
import { SidePanelContentLayout } from './side_panel_content_layout';
import { useWithSidePanel } from '../../hooks/state_selectors/use_with_side_panel';

export const SidePanelContentManager = memo(() => {
  const commands = useWithCommandList();
  const show = useWithSidePanel().show;

  const panelHeader: ReactNode = useMemo(() => {
    if (show === 'help') {
      return (
        <EuiText size="s">
          <strong>
            <FormattedMessage
              id="xpack.securitySolution.console.sidePanel.helpTitle"
              defaultMessage="Help"
            />
          </strong>
        </EuiText>
      );
    }
    return null;
  }, [show]);

  const panelBody: ReactNode = useMemo(() => {
    if (show === 'help') {
      return <CommandList commands={commands} />;
    }

    return null;
  }, [commands, show]);

  if (!show) {
    return null;
  }

  return <SidePanelContentLayout headerContent={panelHeader}>{panelBody}</SidePanelContentLayout>;
});
SidePanelContentManager.displayName = 'RightPanelContentManager';
