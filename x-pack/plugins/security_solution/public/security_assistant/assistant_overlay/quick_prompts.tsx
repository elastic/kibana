/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiFlexGroup, EuiFlexItem, EuiBadge } from '@elastic/eui';
import styled from 'styled-components';

const QuickPromptsFlexGroup = styled(EuiFlexGroup)`
  margin: 16px;
`;

type QuickPrompt = {
  text: string;
  color: string;
};
const quickPrompts: QuickPrompt[] = [
  { text: 'Alert Summarization', color: 'accent' },
  { text: 'Rule Creation', color: 'success' },
  { text: 'Workflow Analysis', color: 'primary' },
  { text: 'Threat Investigation Guides', color: 'warning' },
];
interface QuickPromptsProps {
  setInput: (input: string) => void;
}
export const QuickPrompts: React.FC<QuickPromptsProps> = React.memo(({ setInput }) => {
  return (
    <QuickPromptsFlexGroup gutterSize="s" alignItems="center">
      {quickPrompts.map((badge, index) => (
        <EuiFlexItem key={index} grow={false}>
          <EuiBadge
            color={badge.color}
            onClick={() => setInput(badge.text)}
            onClickAriaLabel={badge.text}
          >
            {badge.text}
          </EuiBadge>
        </EuiFlexItem>
      ))}
    </QuickPromptsFlexGroup>
  );
});
QuickPrompts.displayName = 'QuickPrompts';
