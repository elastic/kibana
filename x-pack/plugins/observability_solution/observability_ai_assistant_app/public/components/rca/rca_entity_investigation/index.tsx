/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React from 'react';
import { i18n } from '@kbn/i18n';
import {
  EuiAccordion,
  EuiFlexGroup,
  EuiFlexItem,
  EuiMarkdownFormat,
  EuiPanel,
  EuiSpacer,
  EuiTitle,
} from '@elastic/eui';
import type { EntityInvestigation } from '@kbn/observability-ai-server/root_cause_analysis/tasks/investigate_entity/types';
import { EntityBadge } from '../entity_badge';
import { RootCauseAnalysisEntityLogPatternTable } from '../rca_entity_log_pattern_table';

export function RootCauseAnalysisEntityInvestigation({
  summary,
  entity,
  ownPatterns,
  patternsFromOtherEntities,
}: {
  summary: string;
  entity: Record<string, string>;
} & Pick<EntityInvestigation['attachments'], 'ownPatterns' | 'patternsFromOtherEntities'>) {
  return (
    <EuiPanel hasBorder paddingSize="l">
      <EuiAccordion
        id={`panel_${JSON.stringify(entity)}`}
        buttonContent={
          <EuiFlexGroup direction="row" gutterSize="s">
            <EuiTitle size="xs">
              <h2>
                {i18n.translate(
                  'xpack.observabilityAiAssistant.rootCauseAnalysisEntityInvestigation.title',
                  {
                    defaultMessage: 'Investigation',
                  }
                )}
              </h2>
            </EuiTitle>
            <EuiFlexItem grow={false}>
              <EntityBadge entity={entity} />
            </EuiFlexItem>
          </EuiFlexGroup>
        }
      >
        <EuiSpacer size="l" />
        <EuiFlexGroup direction="column" gutterSize="l">
          <EuiPanel color="subdued" paddingSize="l">
            <EuiMarkdownFormat textSize="s">{summary}</EuiMarkdownFormat>
          </EuiPanel>
          <RootCauseAnalysisEntityLogPatternTable
            entity={entity}
            ownPatterns={ownPatterns}
            patternsFromOtherEntities={patternsFromOtherEntities}
          />
        </EuiFlexGroup>
      </EuiAccordion>
    </EuiPanel>
  );
}
