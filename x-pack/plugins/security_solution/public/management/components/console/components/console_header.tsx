/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo, useCallback } from 'react';
import { EuiButtonIcon, EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { useConsoleStateDispatch } from '../hooks/state_selectors/use_console_state_dispatch';
import { useWithSidePanel } from '../hooks/state_selectors/use_with_side_panel';
import { ConsoleProps } from '..';

const HELP_LABEL = i18n.translate('xpack.securitySolution.console.layoutHeader.helpButtonLabel', {
  defaultMessage: 'Show help',
});

export type ConsoleHeaderProps = Pick<ConsoleProps, 'TitleComponent'>;

export const ConsoleHeader = memo<ConsoleHeaderProps>(({ TitleComponent }) => {
  const dispatch = useConsoleStateDispatch();
  const panelCurrentlyShowing = useWithSidePanel().show;
  const isHelpOpen = panelCurrentlyShowing === 'help';

  const handleHelpButtonOnClick = useCallback(() => {
    dispatch({
      type: 'showSidePanel',
      payload: { show: isHelpOpen ? null : 'help' },
    });
  }, [dispatch, isHelpOpen]);

  return (
    <EuiFlexGroup gutterSize="none" alignItems="center" responsive={false}>
      <EuiFlexItem grow className="eui-textTruncate">
        {TitleComponent ? <TitleComponent /> : ''}
      </EuiFlexItem>
      <EuiFlexItem grow={false}>
        <EuiButtonIcon
          onClick={handleHelpButtonOnClick}
          iconType="help"
          title={HELP_LABEL}
          aria-label={HELP_LABEL}
          isSelected={isHelpOpen}
          display={isHelpOpen ? 'fill' : 'empty'}
        />
      </EuiFlexItem>
    </EuiFlexGroup>
  );
});
ConsoleHeader.displayName = 'ConsoleHeader';
