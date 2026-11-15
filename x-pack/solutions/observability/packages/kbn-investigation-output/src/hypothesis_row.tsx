/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import {
  EuiAccordion,
  EuiBadge,
  EuiFlexGroup,
  EuiFlexItem,
  EuiIcon,
  EuiLoadingSpinner,
  EuiMarkdownFormat,
  EuiSpacer,
  EuiText,
  useGeneratedHtmlId,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import type { Hypothesis, HypothesisStatus } from '@kbn/agentic-investigations-plugin/common';
import { EvidenceList } from './evidence_list';

const HYPOTHESIS_STATUS_ICON: Record<HypothesisStatus, string> = {
  investigating: 'clock',
  dismissed: 'dashedCircle',
  confirmed: 'checkCircle',
};

/**
 * One hypothesis: its status, candidate, and confidence, expanding to the reasoning and the
 * evidence it rests on (charts and descriptions).
 */
export const HypothesisRow: React.FC<{ hypothesis: Hypothesis }> = ({ hypothesis }) => {
  const { candidate, confidence, status, reason, evidence = [] } = hypothesis;
  const accordionId = useGeneratedHtmlId({ prefix: 'investigationHypothesis' });

  return (
    <EuiAccordion
      id={accordionId}
      data-test-subj="investigationOutputHypothesis"
      paddingSize="s"
      buttonContent={
        <EuiFlexGroup alignItems="center" gutterSize="s" responsive={false}>
          <EuiFlexItem grow={false}>
            {status === 'investigating' ? (
              <EuiLoadingSpinner size="s" />
            ) : (
              <EuiIcon
                type={HYPOTHESIS_STATUS_ICON[status]}
                color="text"
                data-test-subj={`investigationOutputHypothesisStatus-${status}`}
                aria-hidden={true}
              />
            )}
          </EuiFlexItem>
          <EuiFlexItem grow={true}>
            <EuiText size="xs" color="text">
              <strong>
                {i18n.translate('xpack.investigationOutput.hypothesis', {
                  defaultMessage: 'Hypothesis:',
                })}
              </strong>{' '}
              <span>{candidate}</span>
            </EuiText>
          </EuiFlexItem>
        </EuiFlexGroup>
      }
      extraAction={
        <EuiBadge
          color={status === 'confirmed' ? 'success' : 'hollow'}
          data-test-subj="investigationOutputConfidenceBadge"
        >
          <FormattedMessage
            id="xpack.investigationOutput.hypothesisConfidenceBadgeLabel"
            defaultMessage="{confidence, number, percent}"
            values={{ confidence }}
          />
        </EuiBadge>
      }
    >
      {reason?.trim() ? (
        <EuiMarkdownFormat textSize="xs" color="subdued">
          {reason}
        </EuiMarkdownFormat>
      ) : (
        <EuiText size="xs" color="subdued">
          <p>
            {i18n.translate('xpack.investigationOutput.noReasonRecordedDescription', {
              defaultMessage: 'No reasoning recorded yet.',
            })}
          </p>
        </EuiText>
      )}

      {evidence.length > 0 && (
        <>
          <EuiSpacer size="s" />
          <EvidenceList evidence={evidence} />
        </>
      )}
    </EuiAccordion>
  );
};
