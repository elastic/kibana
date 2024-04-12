/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { AssistantAvatar, useAssistantContext } from '@kbn/elastic-assistant';
import type { Replacements } from '@kbn/elastic-assistant-common';
import { EuiButton, EuiButtonEmpty, EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import React, { useCallback } from 'react';

import { useAssistantAvailability } from '../../../assistant/use_assistant_availability';
import * as i18n from './translations';

interface Props {
  compact?: boolean;
  conversationTitle?: string;
  promptContextId: string | undefined;
  replacements?: Replacements;
}

const ViewInAiAssistantComponent: React.FC<Props> = ({
  compact = false,
  conversationTitle,
  promptContextId,
  replacements,
}) => {
  const { hasAssistantPrivilege } = useAssistantAvailability();
  const { showAssistantOverlay } = useAssistantContext();

  // proxy show / hide calls to assistant context, using our internal prompt context id:
  const showOverlay = useCallback(() => {
    showAssistantOverlay({
      conversationTitle,
      promptContextId,
      showOverlay: true,
    });
  }, [conversationTitle, promptContextId, showAssistantOverlay]);

  const disabled = !hasAssistantPrivilege || promptContextId == null;

  return compact ? (
    <EuiButtonEmpty
      data-test-subj="viewInAiAssistantCompact"
      disabled={disabled}
      iconType="expand"
      onClick={showOverlay}
      size="xs"
    >
      {i18n.VIEW_IN_AI_ASSISTANT}
    </EuiButtonEmpty>
  ) : (
    <EuiButton
      data-test-subj="viewInAiAssistant"
      disabled={disabled}
      onClick={showOverlay}
      size="s"
    >
      <EuiFlexGroup alignItems="center" gutterSize="xs">
        <EuiFlexItem data-test-subj="assistantAvatar" grow={false}>
          <AssistantAvatar size="xs" />
        </EuiFlexItem>
        <EuiFlexItem data-test-subj="viewInAiAssistantLabel" grow={false}>
          {i18n.VIEW_IN_AI_ASSISTANT}
        </EuiFlexItem>
      </EuiFlexGroup>
    </EuiButton>
  );
};

ViewInAiAssistantComponent.displayName = 'ViewInAiAssistant';

export const ViewInAiAssistant = React.memo(ViewInAiAssistantComponent);
