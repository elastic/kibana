/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { ContentRef } from '@kbn/wci-common';
import {
  EuiPanel,
  EuiText,
  EuiTextColor,
  EuiIcon,
  EuiFlexGroup,
  EuiFlexItem,
  useEuiTheme,
} from '@elastic/eui';
import type { ConversationRound } from '../../../utils/conversation_rounds';

interface RoundTabSourcesProps {
  round: ConversationRound;
}

export const RoundTabSources: React.FC<RoundTabSourcesProps> = ({ round }) => {
  const { assistantMessage } = round;

  if (!assistantMessage) {
    return undefined;
  }

  const references = assistantMessage.citations;

  return (
    <EuiFlexGroup direction="column" gutterSize="m">
      {references.map((ref) => (
        <EuiFlexItem>
          <SourceSummary key={`${ref.sourceId}-${ref.contentId}`} contentRef={ref} />
        </EuiFlexItem>
      ))}
    </EuiFlexGroup>
  );
};

interface SourceSummaryProps {
  contentRef: ContentRef;
}

const SourceSummary: React.FC<SourceSummaryProps> = ({ contentRef }) => {
  const { euiTheme } = useEuiTheme();

  return (
    <EuiPanel hasShadow={false} hasBorder={true}>
      <EuiFlexGroup direction="column" gutterSize="s">
        <EuiFlexItem>
          <EuiFlexGroup
            direction="row"
            gutterSize="s"
            justifyContent="flexStart"
            alignItems="center"
          >
            <EuiFlexItem grow={false}>
              <EuiIcon type="database" color="primary" />
            </EuiFlexItem>
            <EuiFlexItem>
              <EuiText size="s">
                <EuiTextColor color={euiTheme.colors.link}>{contentRef.sourceId}</EuiTextColor>
              </EuiText>
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiFlexItem>
        <EuiFlexItem>
          <EuiText size="m">{contentRef.contentId}</EuiText>
        </EuiFlexItem>
        <EuiFlexItem>
          <EuiText color="subdued" size="s">
            Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor
            incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud
            exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat
          </EuiText>
        </EuiFlexItem>
      </EuiFlexGroup>
    </EuiPanel>
  );
};
