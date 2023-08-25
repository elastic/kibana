/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiFlexGroup, EuiFlexItem, EuiHeaderLink, EuiToolTip } from '@elastic/eui';
import React, { useCallback } from 'react';

import { i18n } from '@kbn/i18n';
import { useAssistantContext } from '@kbn/elastic-assistant/impl/assistant_context';
import { AssistantAvatar } from '@kbn/elastic-assistant';

const isMac = navigator.platform.toLowerCase().indexOf('mac') >= 0;

/**
 * Elastic AI Assistant header link
 */
export const AssistantHeaderLink = React.memo(() => {
  const { showAssistantOverlay } = useAssistantContext();

  const keyboardShortcut = isMac ? '⌘ ;' : 'Ctrl ;';

  const tooltipContent = i18n.translate(
    'xpack.securitySolution.globalHeader.assistantHeaderLinkShortcutTooltip',
    {
      values: { keyboardShortcut },
      defaultMessage: 'Keyboard shortcut {keyboardShortcut}',
    }
  );

  const showOverlay = useCallback(
    () => showAssistantOverlay({ showOverlay: true }),
    [showAssistantOverlay]
  );

  return (
    <EuiToolTip content={tooltipContent}>
      <EuiHeaderLink data-test-subj="assistantHeaderLink" color="primary" onClick={showOverlay}>
        <EuiFlexGroup gutterSize="s" alignItems="center">
          <EuiFlexItem grow={false}>
            <AssistantAvatar size="xs" />
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            {i18n.translate('xpack.securitySolution.globalHeader.assistantHeaderLink', {
              defaultMessage: 'AI Assistant',
            })}
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiHeaderLink>
    </EuiToolTip>
  );
});

AssistantHeaderLink.displayName = 'AssistantHeaderLink';
