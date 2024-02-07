/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React from 'react';
import { EuiFlexGroup, EuiFlexItem, EuiPanel } from '@elastic/eui';
import type { Suggestion } from '../../../common/types';

export function SuggestionButton({
  suggestion,
  onSelect,
}: {
  suggestion: Suggestion;
  onSelect: ({ prompt }: { prompt: string }) => void;
}) {
  const handleClick = () => onSelect({ prompt: suggestion.prompt });

  return (
    <EuiPanel hasBorder hasShadow={false} onClick={handleClick} paddingSize="m">
      <EuiFlexGroup>
        <EuiFlexItem grow>{suggestion.prompt}</EuiFlexItem>
      </EuiFlexGroup>
    </EuiPanel>
  );
}
