/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { css } from '@emotion/react';
import {
  EuiBadge,
  EuiFlexGroup,
  EuiFlexItem,
  EuiMarkdownFormat,
  EuiText,
  EuiTitle,
  useEuiTheme,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import type {
  Investigation,
  InvestigationProposalSummary,
} from '@kbn/agentic-investigations-plugin/common';
import { ImpactSection } from './impact_section';

const PROPOSAL_STATUS_LABELS: Record<InvestigationProposalSummary['status'], string> = {
  pending: i18n.translate('xpack.investigationOutput.proposalStatus.pending', {
    defaultMessage: 'Needs review',
  }),
  executing: i18n.translate('xpack.investigationOutput.proposalStatus.executing', {
    defaultMessage: 'Executing',
  }),
  succeeded: i18n.translate('xpack.investigationOutput.proposalStatus.succeeded', {
    defaultMessage: 'Succeeded',
  }),
  failed: i18n.translate('xpack.investigationOutput.proposalStatus.failed', {
    defaultMessage: 'Failed',
  }),
  expired: i18n.translate('xpack.investigationOutput.proposalStatus.expired', {
    defaultMessage: 'Expired',
  }),
  no_action: i18n.translate('xpack.investigationOutput.proposalStatus.noAction', {
    defaultMessage: 'No action',
  }),
  superseded: i18n.translate('xpack.investigationOutput.proposalStatus.superseded', {
    defaultMessage: 'Superseded',
  }),
};

const Section: React.FC<React.PropsWithChildren<{ title: string; 'data-test-subj': string }>> = ({
  title,
  children,
  'data-test-subj': dataTestSubj,
}) => (
  <EuiFlexItem grow={false} data-test-subj={dataTestSubj}>
    <EuiTitle size="xxs">
      <h4>{title}</h4>
    </EuiTitle>
    {children}
  </EuiFlexItem>
);

/** The conclusion, the impact, and the proposed actions of an investigation nothing works on. */
export const FinalResults: React.FC<{ investigation: Investigation }> = ({ investigation }) => {
  const { euiTheme } = useEuiTheme();
  const { verdict } = investigation.metadata;
  const impact = investigation.impact;
  const hasImpact = Boolean(
    impact?.summary?.trim() || impact?.evidence || (impact?.entities ?? []).length > 0
  );
  const { proposals } = investigation;

  if (!verdict && !hasImpact && proposals.length === 0) {
    return null;
  }

  return (
    <EuiFlexGroup
      direction="column"
      gutterSize="m"
      data-test-subj="investigationOutputFinalResults"
      css={css`
        padding: ${euiTheme.size.base};
      `}
    >
      {verdict && (
        <Section
          title={i18n.translate('xpack.investigationOutput.conclusionTitle', {
            defaultMessage: 'Conclusion',
          })}
          data-test-subj="investigationOutputConclusion"
        >
          <EuiMarkdownFormat textSize="s">{verdict}</EuiMarkdownFormat>
        </Section>
      )}
      {impact && hasImpact && (
        <Section
          title={i18n.translate('xpack.investigationOutput.impactTitle', {
            defaultMessage: 'Impact',
          })}
          data-test-subj="investigationOutputImpactSection"
        >
          <ImpactSection impact={impact} />
        </Section>
      )}
      {proposals.length > 0 && (
        <Section
          title={i18n.translate('xpack.investigationOutput.proposedActionsTitle', {
            defaultMessage: 'Proposed actions',
          })}
          data-test-subj="investigationOutputProposals"
        >
          <EuiFlexGroup direction="column" gutterSize="xs">
            {proposals.map((proposal) => (
              <EuiFlexItem key={proposal.id} grow={false}>
                <EuiFlexGroup gutterSize="s" alignItems="center" responsive={false}>
                  <EuiFlexItem grow={false}>
                    <EuiBadge color={proposal.status === 'pending' ? 'accent' : 'hollow'}>
                      {PROPOSAL_STATUS_LABELS[proposal.status]}
                    </EuiBadge>
                  </EuiFlexItem>
                  <EuiFlexItem>
                    <EuiText size="s">{proposal.title}</EuiText>
                  </EuiFlexItem>
                </EuiFlexGroup>
              </EuiFlexItem>
            ))}
          </EuiFlexGroup>
        </Section>
      )}
    </EuiFlexGroup>
  );
};
