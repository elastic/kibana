/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState } from 'react';
import {
  EuiAccordion,
  EuiBadge,
  EuiButtonEmpty,
  EuiCodeBlock,
  EuiFlexGroup,
  EuiFlexItem,
  EuiHorizontalRule,
  EuiIconTip,
  EuiPanel,
  EuiText,
  EuiTitle,
  useEuiTheme,
  useGeneratedHtmlId,
} from '@elastic/eui';
import type { UseEuiTheme } from '@elastic/eui';
import { css } from '@emotion/react';
import { i18n } from '@kbn/i18n';
import type { SigEvent } from '@kbn/streams-schema';

/*
 * Duplicated (not shared) from
 * x-pack/platform/plugins/shared/streams_app/public/components/sig_events/sig_event_details/root_cause_card.tsx
 * (kibana#274863, boriskirov) — `streams_app` is package group "platform" and this package is
 * group "observability" with visibility "private", so importing across that boundary isn't
 * allowed today. Duplicated deliberately for the v0 Nightshift landing page rather than
 * flipping @kbn/nightshift's visibility unilaterally. Reconcile before this stops being a demo.
 *
 * Adds, beyond the original: the raw `evidence.esql_query` is now always shown (the original
 * only showed `description`, never the actual query — this is the "drill into the underlying
 * data" gap), plus an optional `onOpenInDiscover` action per evidence row.
 */

const ROOT_CAUSE_LABEL = i18n.translate('xpack.nightshift.rootCauseCard.rootCauseLabel', {
  defaultMessage: 'Root cause',
});

const EVIDENCE_TRAIL_LABEL = i18n.translate('xpack.nightshift.rootCauseCard.evidenceTrailLabel', {
  defaultMessage: 'Evidence trail',
});

const NO_ROOT_CAUSE_LABEL = i18n.translate('xpack.nightshift.rootCauseCard.noRootCause', {
  defaultMessage: 'No root cause correction was issued for this event.',
});

const EVIDENCE_LABEL = i18n.translate('xpack.nightshift.rootCauseCard.evidenceLabel', {
  defaultMessage: 'Evidence',
});

const QUERY_LABEL = i18n.translate('xpack.nightshift.rootCauseCard.queryLabel', {
  defaultMessage: 'Query',
});

const OPEN_IN_DISCOVER_LABEL = i18n.translate('xpack.nightshift.rootCauseCard.openInDiscover', {
  defaultMessage: 'Open in Discover',
});

const ASSESSMENT_LABEL = i18n.translate('xpack.nightshift.rootCauseCard.assessmentLabel', {
  defaultMessage: 'Assessment',
});

const EVIDENCE_RESULT_LABELS = {
  found: i18n.translate('xpack.nightshift.rootCauseCard.result.found', {
    defaultMessage: 'Rows found',
  }),
  empty: i18n.translate('xpack.nightshift.rootCauseCard.result.empty', {
    defaultMessage: 'No rows',
  }),
  error: i18n.translate('xpack.nightshift.rootCauseCard.result.error', {
    defaultMessage: 'Query error',
  }),
} as const;

const EVIDENCE_CONFIRMED_LABEL = i18n.translate('xpack.nightshift.rootCauseCard.confirmedLabel', {
  defaultMessage: 'Confirmed',
});

const EVIDENCE_PENDING_LABEL = i18n.translate('xpack.nightshift.rootCauseCard.pendingLabel', {
  defaultMessage: 'Pending verification',
});

// Confidence is unconstrained in the schema and producers use either 0-1 or 0-100.
// Normalize to a 0-100 percentage for display.
const normalizeConfidence = (confidence: number | undefined): number | undefined => {
  if (confidence == null || isNaN(confidence)) return undefined;
  return confidence > 0 && confidence <= 1 ? confidence * 100 : confidence;
};

const confidenceBadgeColor = (
  confidence: number | undefined
): 'success' | 'warning' | 'danger' | 'hollow' => {
  if (confidence == null) return 'hollow';
  if (confidence >= 70) return 'success';
  if (confidence >= 40) return 'warning';
  return 'danger';
};

type Evidence = NonNullable<SigEvent['evidences']>[number];

export interface RootCauseCardProps {
  event: SigEvent;
  /**
   * Called when a user wants to run an evidence row's `esql_query` themselves.
   * Only rendered for rows that have a query. This component has no direct
   * dependency on the `share`/Discover locator — the caller (which has access
   * to Kibana plugin services) is responsible for actually navigating.
   */
  onOpenInDiscover?: (evidence: Evidence) => void;
}

export const RootCauseCard = ({ event, onOpenInDiscover }: RootCauseCardProps) => {
  const euiThemeContext = useEuiTheme();
  const { euiTheme } = euiThemeContext;

  const evidences = event.evidences ?? [];
  const hasEvidences = evidences.length > 0;
  const hasRootCause = Boolean(event.root_cause);
  const hasAssessmentNote = Boolean(event.assessment_note);

  if (!hasRootCause && !hasEvidences && !hasAssessmentNote) {
    return null;
  }

  return (
    <EuiPanel hasBorder hasShadow={false} paddingSize="none">
      <RootCauseHeader event={event} />
      {(hasAssessmentNote || hasEvidences) && (
        <EuiFlexGroup
          direction="column"
          gutterSize="s"
          css={css`
            padding: ${euiTheme.size.s} ${euiTheme.size.base};
            background-color: ${euiTheme.colors.backgroundBaseSubdued};
            border-bottom-left-radius: ${euiTheme.border.radius.medium};
            border-bottom-right-radius: ${euiTheme.border.radius.medium};
          `}
        >
          {hasAssessmentNote && event.assessment_note && (
            <EuiFlexItem grow={false}>
              <AssessmentAccordion note={event.assessment_note} />
            </EuiFlexItem>
          )}
          {hasAssessmentNote && hasEvidences && (
            <EuiFlexItem grow={false}>
              <EuiHorizontalRule
                size="full"
                margin="none"
                css={css`
                  border-color: ${euiTheme.border.color};
                `}
              />
            </EuiFlexItem>
          )}
          {hasEvidences && (
            <EuiFlexItem grow={false}>
              <EvidenceTrail evidences={evidences} onOpenInDiscover={onOpenInDiscover} />
            </EuiFlexItem>
          )}
        </EuiFlexGroup>
      )}
    </EuiPanel>
  );
};

const AssessmentAccordion = ({ note }: { note: string }) => {
  const { euiTheme } = useEuiTheme();
  const assessmentId = useGeneratedHtmlId({ prefix: 'assessment' });

  return (
    <EuiAccordion
      id={assessmentId}
      arrowDisplay="left"
      paddingSize="s"
      buttonContent={
        <EuiText size="xs">
          <strong>{ASSESSMENT_LABEL}</strong>
        </EuiText>
      }
    >
      <EuiPanel
        color="plain"
        hasBorder={false}
        hasShadow={false}
        paddingSize="m"
        css={css`
          margin-top: ${euiTheme.size.s};
          margin-left: ${euiTheme.size.l};
        `}
      >
        <EuiText size="s">
          <p>{note}</p>
        </EuiText>
      </EuiPanel>
    </EuiAccordion>
  );
};

const RootCauseHeader = ({ event }: { event: SigEvent }) => {
  const { euiTheme } = useEuiTheme();

  return (
    <EuiPanel
      color="transparent"
      hasShadow={false}
      hasBorder={false}
      paddingSize="m"
      borderRadius="none"
    >
      <EuiFlexGroup gutterSize="s" alignItems="center" responsive={false}>
        <EuiFlexItem grow={false}>
          <EuiBadge color="hollow">{ROOT_CAUSE_LABEL}</EuiBadge>
        </EuiFlexItem>
        {(() => {
          const confidence = normalizeConfidence(event.confidence);
          if (confidence == null) return null;
          return (
            <EuiFlexItem grow={false}>
              <EuiBadge color={confidenceBadgeColor(confidence)}>
                {i18n.translate('xpack.nightshift.rootCauseCard.confidenceBadgeLabel', {
                  defaultMessage: 'Confidence {value}%',
                  values: { value: Math.round(confidence) },
                })}
              </EuiBadge>
            </EuiFlexItem>
          );
        })()}
      </EuiFlexGroup>

      {event.title && (
        <EuiTitle size="xxs">
          <h6
            css={css`
              margin-top: ${euiTheme.size.m};
            `}
          >
            {event.title}
          </h6>
        </EuiTitle>
      )}

      <EuiText
        size="xs"
        color={event.root_cause ? 'default' : 'subdued'}
        css={css`
          margin-top: ${euiTheme.size.s};
        `}
      >
        <p>{event.root_cause || NO_ROOT_CAUSE_LABEL}</p>
      </EuiText>
    </EuiPanel>
  );
};

const EvidenceTrail = ({
  evidences,
  onOpenInDiscover,
}: {
  evidences: Evidence[];
  onOpenInDiscover?: (evidence: Evidence) => void;
}) => {
  const trailId = useGeneratedHtmlId({ prefix: 'evidenceTrail' });

  return (
    <EuiAccordion
      id={trailId}
      arrowDisplay="left"
      paddingSize="s"
      buttonContent={
        <EuiFlexGroup gutterSize="s" alignItems="center" responsive={false}>
          <EuiFlexItem grow={false}>
            <EuiText size="xs">
              <strong>{EVIDENCE_TRAIL_LABEL}</strong>
            </EuiText>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiBadge color="hollow">{evidences.length}</EuiBadge>
          </EuiFlexItem>
        </EuiFlexGroup>
      }
    >
      <EuiFlexGroup direction="column" gutterSize="s">
        {evidences.map((evidence, idx) => (
          <EuiFlexItem grow={false} key={`evidence-${idx}`}>
            <EvidenceRow evidence={evidence} index={idx} onOpenInDiscover={onOpenInDiscover} />
          </EuiFlexItem>
        ))}
      </EuiFlexGroup>
    </EuiAccordion>
  );
};

const EvidenceRow = ({
  evidence,
  index,
  onOpenInDiscover,
}: {
  evidence: Evidence;
  index: number;
  onOpenInDiscover?: (evidence: Evidence) => void;
}) => {
  const euiThemeContext = useEuiTheme();
  const rowId = useGeneratedHtmlId({ prefix: `evidence-${index}` });
  const [isOpen, setIsOpen] = useState(false);

  const dotColor = evidenceDotColor(evidence, euiThemeContext);

  const titleLabel =
    evidence.rule_name ||
    evidence.description ||
    i18n.translate('xpack.nightshift.rootCauseCard.unnamedEvidence', {
      defaultMessage: 'Unnamed evidence',
    });

  const statusLabel = evidenceStatusLabel(evidence);

  const buttonContent = (
    <EuiFlexGroup gutterSize="s" alignItems="center" responsive={false} wrap={false}>
      <EuiFlexItem grow={false}>
        <EuiIconTip
          type="dot"
          size="m"
          color={dotColor}
          aria-label={statusLabel}
          content={statusLabel}
        />
      </EuiFlexItem>
      <EuiFlexItem>
        <EuiText
          size="xs"
          css={css`
            white-space: normal;
            text-align: left;
          `}
        >
          <strong>{titleLabel}</strong>
        </EuiText>
      </EuiFlexItem>
    </EuiFlexGroup>
  );

  const extraAction = evidence.stream_name ? (
    <EuiBadge color="hollow">{evidence.stream_name}</EuiBadge>
  ) : undefined;

  return (
    <EuiAccordion
      id={rowId}
      arrowDisplay="left"
      paddingSize="s"
      forceState={isOpen ? 'open' : 'closed'}
      onToggle={setIsOpen}
      buttonContent={buttonContent}
      extraAction={extraAction}
    >
      <EvidenceBody evidence={evidence} onOpenInDiscover={onOpenInDiscover} />
    </EuiAccordion>
  );
};

const EvidenceBody = ({
  evidence,
  onOpenInDiscover,
}: {
  evidence: Evidence;
  onOpenInDiscover?: (evidence: Evidence) => void;
}) => {
  const { euiTheme } = useEuiTheme();

  return (
    <EuiPanel
      color="plain"
      hasBorder={false}
      hasShadow={false}
      paddingSize="m"
      css={css`
        margin-top: ${euiTheme.size.s};
        margin-left: ${euiTheme.size.l};
      `}
    >
      <EuiText size="xs">
        <strong>{EVIDENCE_LABEL}</strong>
      </EuiText>
      {evidence.description && (
        <EuiText
          size="s"
          css={css`
            margin-top: ${euiTheme.size.s};
            font-family: ${euiTheme.font.familyCode};
          `}
        >
          <p>{evidence.description}</p>
        </EuiText>
      )}

      {evidence.esql_query && (
        <>
          <EuiText
            size="xs"
            css={css`
              margin-top: ${euiTheme.size.m};
            `}
          >
            <strong>{QUERY_LABEL}</strong>
          </EuiText>
          <EuiCodeBlock
            language="esql"
            fontSize="s"
            paddingSize="s"
            isCopyable
            css={css`
              margin-top: ${euiTheme.size.xs};
            `}
          >
            {evidence.esql_query}
          </EuiCodeBlock>
          {onOpenInDiscover && (
            <EuiButtonEmpty
              size="xs"
              iconType="discoverApp"
              flush="left"
              onClick={() => onOpenInDiscover(evidence)}
              css={css`
                margin-top: ${euiTheme.size.xs};
              `}
            >
              {OPEN_IN_DISCOVER_LABEL}
            </EuiButtonEmpty>
          )}
        </>
      )}
    </EuiPanel>
  );
};

const evidenceStatusLabel = (evidence: Evidence): string => {
  const resultLabel = evidence.result
    ? EVIDENCE_RESULT_LABELS[evidence.result as keyof typeof EVIDENCE_RESULT_LABELS] ??
      evidence.result
    : undefined;

  if (evidence.confirmed) {
    return resultLabel
      ? `${EVIDENCE_CONFIRMED_LABEL} · ${resultLabel}`
      : EVIDENCE_CONFIRMED_LABEL;
  }
  if (resultLabel) {
    return resultLabel;
  }
  return EVIDENCE_PENDING_LABEL;
};

const evidenceDotColor = (evidence: Evidence, euiThemeContext: UseEuiTheme): string => {
  const { euiTheme } = euiThemeContext;
  if (evidence.confirmed) {
    return euiTheme.colors.textSuccess;
  }
  switch (evidence.result) {
    case 'error':
      return euiTheme.colors.textDanger;
    case 'found':
      return euiTheme.colors.textWarning;
    case 'empty':
      return euiTheme.colors.textSubdued;
    default:
      return euiTheme.colors.borderBaseSubdued;
  }
};
