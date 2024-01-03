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

const TOOLTIP_CONTENT = i18n.translate(
  'xpack.securitySolution.globalHeader.assistantHeaderLinkShortcutTooltip',
  {
    values: { keyboardShortcut: isMac ? '⌘ ;' : 'Ctrl ;' },
    defaultMessage: 'Keyboard shortcut {keyboardShortcut}',
  }
);
const LINK_LABEL = i18n.translate('xpack.securitySolution.globalHeader.assistantHeaderLink', {
  defaultMessage: 'AI Assistant',
});

/**
 * Elastic AI Assistant header link
 */
export const AssistantHeaderLink = () => {
  const { showAssistantOverlay, assistantAvailability } = useAssistantContext();

  const showOverlay = useCallback(
    () => showAssistantOverlay({ showOverlay: true }),
    [showAssistantOverlay]
  );

  if (!assistantAvailability.hasAssistantPrivilege) {
    return null;
  }

  return (
    <EuiToolTip content={TOOLTIP_CONTENT}>
      <EuiHeaderLink data-test-subj="assistantHeaderLink" color="primary" onClick={showOverlay}>
        <EuiFlexGroup gutterSize="s" alignItems="center">
          <EuiFlexItem grow={false}>
            <AssistantAvatar size="xs" />
          </EuiFlexItem>
          <EuiFlexItem grow={false}>{LINK_LABEL}</EuiFlexItem>
        </EuiFlexGroup>
      </EuiHeaderLink>
    </EuiToolTip>
  );
};
