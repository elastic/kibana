/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiMarkdownFormat,
  EuiPanel,
  EuiSpacer,
  useEuiTheme,
} from '@elastic/eui';
import { css } from '@emotion/react';
import type { InvestigationEvidence } from '@kbn/significant-events-schema';
import { EvidenceChart } from './evidence_chart';

export interface EvidenceItemProps {
  evidence: InvestigationEvidence;
  /** Frame the chart in a bordered panel. Off when the evidence already sits inside one. */
  outlineChart?: boolean;
}

/** One observation: its chart, when it has one, followed by its Markdown description. */
export const EvidenceItem: React.FC<EvidenceItemProps> = ({
  evidence: { description, chart },
  outlineChart = true,
}) => {
  const hasDescription = Boolean(description?.trim());
  return (
    <>
      {chart &&
        (outlineChart ? (
          <EuiPanel hasBorder hasShadow={false} paddingSize="s">
            <EvidenceChart chart={chart} />
          </EuiPanel>
        ) : (
          <EvidenceChart chart={chart} />
        ))}
      {chart && hasDescription && <EuiSpacer size="s" />}
      {hasDescription && <EuiMarkdownFormat textSize="s">{description ?? ''}</EuiMarkdownFormat>}
    </>
  );
};

export interface EvidenceListProps {
  evidence: InvestigationEvidence[];
}

/**
 * The observations an investigation's claim rests on. Each is a self-contained static chart,
 * Markdown, or both, so it renders the same whether the data was local or fetched remotely.
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
