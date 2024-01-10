/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiBadge, EuiFlexGroup, EuiFlexItem, useEuiTheme } from '@elastic/eui';
import { css } from '@emotion/css';
import React, { useMemo } from 'react';
import { RuleDiffPanelWrapper } from './panel_wrapper';

export interface IndexPatternDiffComponentProps {
  oldIndexPatterns: string[];
  newIndexPatterns: string[];
}

export const IndexPatternDiffComponent = ({
  oldIndexPatterns,
  newIndexPatterns,
}: IndexPatternDiffComponentProps) => {
  const { euiTheme } = useEuiTheme();
  const OldIndexPatternBadges = useMemo(
    () =>
      oldIndexPatterns.map((indexPattern) => <EuiBadge color="hollow">{indexPattern}</EuiBadge>),
    [oldIndexPatterns]
  );

  const NewIndexPatternBadges = useMemo(() => {
    const deletedPatterns = new Set(oldIndexPatterns);
    const addedPatterns = new Set<string>();
    const newBadges = [];
    for (const newIndexPattern of newIndexPatterns) {
      if (deletedPatterns.has(newIndexPattern)) {
        deletedPatterns.delete(newIndexPattern);
        newBadges.push(<EuiBadge color="hollow">{newIndexPattern}</EuiBadge>);
      } else {
        addedPatterns.add(newIndexPattern);
      }
    }
    deletedPatterns.forEach((pattern) =>
      newBadges.push(
        <EuiBadge
          color="hollow"
          css={css`
            color: ${euiTheme.colors.danger};
            border-color: ${euiTheme.colors.danger};
            text-decoration: line-through;
          `}
        >
          {pattern}
        </EuiBadge>
      )
    );
    addedPatterns.forEach((pattern) =>
      newBadges.push(
        <EuiBadge
          color="hollow"
          css={css`
            color: ${euiTheme.colors.successText};
            border-color: ${euiTheme.colors.success};
            text-decoration: underline;
          `}
        >
          {pattern}
        </EuiBadge>
      )
    );
    return newBadges;
  }, [euiTheme.colors, newIndexPatterns, oldIndexPatterns]);

  return (
    <RuleDiffPanelWrapper fieldName="Index Patterns">
      <EuiFlexGroup justifyContent="spaceBetween">
        <EuiFlexItem grow={1}>
          <EuiFlexGroup gutterSize="xs" alignItems="baseline">
            {OldIndexPatternBadges}
          </EuiFlexGroup>
        </EuiFlexItem>
        <EuiFlexItem
          css={css`
            border-left: 1px solid ${euiTheme.colors.mediumShade};
          `}
          grow={false}
        />
        <EuiFlexItem grow={1}>
          <EuiFlexGroup gutterSize="xs" alignItems="baseline">
            {NewIndexPatternBadges}
          </EuiFlexGroup>
        </EuiFlexItem>
      </EuiFlexGroup>
    </RuleDiffPanelWrapper>
  );
};
