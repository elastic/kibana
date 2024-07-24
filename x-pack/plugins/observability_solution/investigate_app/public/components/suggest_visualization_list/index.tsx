/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React from 'react';
import type { Suggestion } from '@kbn/lens-plugin/public';
import {
  EuiButton,
  EuiFlexGroup,
  EuiFlexItem,
  EuiIcon,
  EuiLoadingSpinner,
  EuiText,
} from '@elastic/eui';
import { css } from '@emotion/css';
import { i18n } from '@kbn/i18n';

const containerClassName = css`
  min-height: 32px;
`;

const suggestionClassName = css`
  .euiText {
    text-overflow: ellipsis;
    white-space: nowrap;
    max-width: 140px;
    overflow: hidden;
    text-align: left;
  }
  span {
    justify-content: flex-start;
  }
`;

const iconContainerClassName = css`
  display: flex;
  align-items: center;
  width: 16px;
`;

export function SuggestVisualizationList({
  suggestions,
  loading,
  error,
  onSuggestionClick,
  onSuggestionRollOver,
  onMouseLeave,
}: {
  suggestions?: Array<Suggestion & { id: string }>;
  loading: boolean;
  error?: Error;
  onSuggestionClick: (suggestion: Suggestion) => void;
  onSuggestionRollOver: (suggestion: Suggestion) => void;
  onMouseLeave: () => void;
}) {
  if (error) {
    return (
      <EuiFlexGroup
        direction="row"
        gutterSize="s"
        alignItems="center"
        className={containerClassName}
      >
        <EuiFlexItem grow={false}>
          <EuiIcon color="danger" size="s" type="warning" />
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiText size="xs" color="danger">
            {i18n.translate(
              'xpack.investigateApp.suggestVisualizationList.errorLoadingSuggestionsLabel',
              {
                defaultMessage: 'Error loading suggestions: {message}',
                values: { message: error.message },
              }
            )}
          </EuiText>
        </EuiFlexItem>
      </EuiFlexGroup>
    );
  }

  const icon = loading ? <EuiLoadingSpinner size="s" /> : <EuiIcon type="sortRight" />;

  let message: string = '';

  if (loading && !suggestions?.length) {
    message = i18n.translate(
      'xpack.investigateApp.suggestVisualizationList.loadingSuggestionsLabel',
      {
        defaultMessage: 'Loading suggestions',
      }
    );
  } else if (!loading && !suggestions?.length) {
    message = i18n.translate('xpack.investigateApp.suggestVisualizationList.noSuggestionsLabel', {
      defaultMessage: 'No suitable suggestions',
    });
  }

  return (
    <EuiFlexGroup direction="row" gutterSize="s" alignItems="center" className={containerClassName}>
      <EuiFlexItem grow={false} className={iconContainerClassName}>
        {icon}
      </EuiFlexItem>
      <EuiFlexItem grow>
        {message ? (
          <EuiText size="xs">{message}</EuiText>
        ) : (
          <EuiFlexGroup direction="row" gutterSize="s">
            {suggestions?.map((suggestion) => (
              <EuiFlexItem key={suggestion.id} className={suggestionClassName} grow={false}>
                <EuiButton
                  data-test-subj="investigateSuggestVisualizationListButton"
                  iconType={suggestion.previewIcon}
                  iconSize="s"
                  color="text"
                  size="s"
                  onClick={() => {
                    onSuggestionClick(suggestion);
                  }}
                  onMouseEnter={() => {
                    onSuggestionRollOver(suggestion);
                  }}
                  onMouseLeave={() => {
                    onMouseLeave();
                  }}
                >
                  <EuiText size="xs">{suggestion.title}</EuiText>
                </EuiButton>
              </EuiFlexItem>
            ))}
          </EuiFlexGroup>
        )}
      </EuiFlexItem>
    </EuiFlexGroup>
  );
}
