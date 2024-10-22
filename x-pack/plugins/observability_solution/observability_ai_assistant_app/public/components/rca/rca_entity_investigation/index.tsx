/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React from 'react';
import { i18n } from '@kbn/i18n';
import {
  EuiFlexGroup,
  EuiHorizontalRule,
  EuiMarkdownFormat,
  EuiPanel,
  EuiTitle,
} from '@elastic/eui';
import { EntityBadge } from '../entity_badge';

export function RootCauseAnalysisEntityInvestigation({
  summary,
  entity,
}: {
  summary: string;
  entity: Record<string, string>;
}) {
  return (
    <EuiPanel hasBorder paddingSize="l">
      <EuiFlexGroup direction="column">
        <EuiFlexGroup direction="row" gutterSize="s">
          <EuiTitle size="s">
            <h2>
              {i18n.translate(
                'xpack.observabilityAiAssistant.rootCauseAnalysisEntityInvestigation.title',
                {
                  defaultMessage: 'Investigation',
                }
              )}
            </h2>
          </EuiTitle>
          <EntityBadge entity={entity} />
        </EuiFlexGroup>
      </EuiFlexGroup>
      <EuiHorizontalRule margin="xl" />
      <EuiMarkdownFormat textSize="s">{summary}</EuiMarkdownFormat>
    </EuiPanel>
  );
}
