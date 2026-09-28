/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiFlexGroup, EuiFlexItem, EuiSpacer, useEuiTheme } from '@elastic/eui';
import { css } from '@emotion/react';
import type { InvestigationEvidence } from '@kbn/significant-events-schema';
import { EvidenceChart } from './evidence_chart';
import { EvidenceMarkdown } from './evidence_markdown';

export interface EvidenceItemProps {
  evidence: InvestigationEvidence;
}

/** One observation: its Markdown description followed by its chart, when it has one. */
export const EvidenceItem: React.FC<EvidenceItemProps> = ({ evidence: { description, chart } }) => (
  <>
    <EvidenceMarkdown>{description}</EvidenceMarkdown>
    {chart && (
      <>
        <EuiSpacer size="s" />
        <EvidenceChart chart={chart} />
      </>
    )}
  </>
);

export interface EvidenceListProps {
  evidence: InvestigationEvidence[];
}

/**
 * The observations an investigation's claim rests on. Each is self-contained Markdown plus an
 * optional static chart, so it renders the same whether the data was local or fetched remotely.
 */
export const EvidenceList: React.FC<EvidenceListProps> = ({ evidence }) => {
  const { euiTheme } = useEuiTheme();

  if (evidence.length === 0) {
    return null;
  }

  return (
    <EuiFlexGroup direction="column" gutterSize="s" data-test-subj="investigationEvidenceList">
      {evidence.map((item, index) => {
        const isLast = index === evidence.length - 1;

        return (
          <EuiFlexItem
            key={index}
            grow={false}
            data-test-subj="investigationEvidenceItem"
            css={css`
              border-bottom: ${isLast ? 'none' : euiTheme.border.thin};
              padding-bottom: ${isLast ? '0' : euiTheme.size.s};
            `}
          >
            <EvidenceItem evidence={item} />
          </EuiFlexItem>
        );
      })}
    </EuiFlexGroup>
  );
};
