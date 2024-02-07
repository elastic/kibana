/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React, { useMemo } from 'react';
import { EuiFlexGroup, EuiFlexItem, EuiLoadingSpinner, useEuiTheme } from '@elastic/eui';
import { css } from '@emotion/css';
import { SuggestionButton } from './suggestion_button';
import type { Suggestion } from '../../../common/types';

const GUTTER_SIZE = 's';

export function Suggestions({
  isLoading,
  suggestions = [],
  onSelect,
}: {
  isLoading: boolean;
  suggestions: Suggestion[];
  onSelect: ({ prompt }: { prompt: string }) => void;
}) {
  const { euiTheme } = useEuiTheme();

  const buttonContainerClassName = css`
    min-width: calc(50% - ${euiTheme.size[GUTTER_SIZE]});
    max-width: calc(50% - ${euiTheme.size[GUTTER_SIZE]});
  `;

  const appName = window.location.pathname
    .split('/')
    .reduce((acc, pathPartial, index, arr) => (pathPartial === 'app' ? arr[index + 1] : acc), '');

  const filteredSuggestions = useMemo(() => {
    return suggestions.sort((a) => (a.app === appName ? -1 : 1)).slice(0, 4) || [];
  }, [appName, suggestions]);

  return (
    <EuiFlexGroup direction="row" gutterSize={GUTTER_SIZE} wrap>
      {isLoading ? (
        <EuiFlexItem grow={false}>
          <EuiLoadingSpinner size="s" />
        </EuiFlexItem>
      ) : (
        filteredSuggestions.map((suggestion) => (
          <EuiFlexItem key={suggestion.prompt} className={buttonContainerClassName}>
            <SuggestionButton suggestion={suggestion} onSelect={onSelect} />
          </EuiFlexItem>
        ))
      )}
    </EuiFlexGroup>
  );
}
