/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { AssistantAvatar } from '@kbn/elastic-assistant';
import type { AttackDiscovery, Replacements } from '@kbn/elastic-assistant-common';
import { EuiButton, EuiButtonEmpty, EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import React from 'react';

import * as i18n from './translations';
import { useViewInAiAssistant } from './use_view_in_ai_assistant';

interface Props {
  attackDiscovery: AttackDiscovery;
  compact?: boolean;
  replacements?: Replacements;
}

const ViewInAiAssistantComponent: React.FC<Props> = ({
  attackDiscovery,
  compact = false,
  replacements,
}) => {
  const { showAssistantOverlay, disabled } = useViewInAiAssistant({
    attackDiscovery,
    replacements,
  });

  return compact ? (
    <EuiButtonEmpty
      data-test-subj="viewInAiAssistantCompact"
      disabled={disabled}
      iconType="expand"
      onClick={showAssistantOverlay}
      size="xs"
    >
      {i18n.VIEW_IN_AI_ASSISTANT}
    </EuiButtonEmpty>
  ) : (
    <EuiButton
      data-test-subj="viewInAiAssistant"
      disabled={disabled}
      onClick={showAssistantOverlay}
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
