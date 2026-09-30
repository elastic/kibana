/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState } from 'react';
import {
  EuiAccordion,
  EuiButtonEmpty,
  EuiMarkdownFormat,
  EuiPanel,
  EuiSpacer,
  EuiText,
  EuiTextColor,
  useEuiTheme,
  useGeneratedHtmlId,
} from '@elastic/eui';
import { css } from '@emotion/react';
import { i18n } from '@kbn/i18n';
import type {
  InvestigationImpact,
  InvestigationImpactEntity,
} from '@kbn/significant-events-schema';
import { EvidenceItem } from './evidence_list';

/** Impact summaries longer than this are cut short behind "Show more". */
export const IMPACT_SUMMARY_MAX_LENGTH = 500;

/** Cuts `text` to at most `maxLength` characters at a word boundary and marks the cut. */
const truncateAtWord = (text: string, maxLength: number): string => {
  const cut = text.slice(0, maxLength);
  const lastSpace = cut.lastIndexOf(' ');
  return `${(lastSpace > 0 ? cut.slice(0, lastSpace) : cut).trimEnd()}…`;
};

export interface ImpactSectionProps {
  impact: InvestigationImpact;
}

const EntityHeader: React.FC<{ entity: InvestigationImpactEntity }> = ({ entity }) => (
  <EuiText size="s">
    <strong>{entity.name}</strong>
    {entity.type && (
      <EuiTextColor color="subdued" data-test-subj="investigationOutputImpactEntityType">
        {` · ${entity.type}`}
      </EuiTextColor>
    )}
  </EuiText>
);

/**
 * One impacted entity, as a row of the shared entity panel. Its evidence is collapsed by default
 * so the impact summary leads.
 */
const ImpactEntityRow: React.FC<{ entity: InvestigationImpactEntity; isLast: boolean }> = ({
  entity,
  isLast,
}) => {
  const { euiTheme } = useEuiTheme();
  const accordionId = useGeneratedHtmlId({ prefix: 'investigationImpactEntity' });

  return (
    <EuiPanel
      color="transparent"
      hasBorder={false}
      hasShadow={false}
      paddingSize="none"
      borderRadius="none"
      data-test-subj="investigationOutputImpactEntity"
      css={css`
        padding: ${euiTheme.size.s} ${euiTheme.size.m};
        border-bottom: ${isLast ? 'none' : euiTheme.border.thin};
      `}
    >
      {entity.evidence ? (
        <EuiAccordion
          id={accordionId}
          buttonContent={<EntityHeader entity={entity} />}
          paddingSize="none"
          data-test-subj="investigationOutputImpactEntityAccordion"
        >
          <EuiSpacer size="s" />
          <EvidenceItem evidence={entity.evidence} outlineChart={false} />
        </EuiAccordion>
      ) : (
        <EntityHeader entity={entity} />
      )}
    </EuiPanel>
  );
};

/**
 * What the investigation found was affected: the impact summary (long ones cut short behind
 * "Show more"), the evidence backing it (chart first), then the impacted entities in one shared
 * panel.
 */
export const ImpactSection: React.FC<ImpactSectionProps> = ({ impact }) => {
  const { summary = '', evidence, entities = [] } = impact;
  const [isSummaryExpanded, setIsSummaryExpanded] = useState(false);
  const trimmedSummary = summary.trim();
  if (!trimmedSummary && !evidence && entities.length === 0) {
    return null;
  }

  const isSummaryLong = trimmedSummary.length > IMPACT_SUMMARY_MAX_LENGTH;
  const shownSummary =
    isSummaryLong && !isSummaryExpanded
      ? truncateAtWord(trimmedSummary, IMPACT_SUMMARY_MAX_LENGTH)
      : trimmedSummary;

  return (
    <div data-test-subj="investigationOutputImpact">
      {trimmedSummary && (
        <div data-test-subj="investigationOutputImpactSummary">
          <EuiMarkdownFormat textSize="s" color="default">
            {shownSummary}
          </EuiMarkdownFormat>
        </div>
      )}
      {isSummaryLong && (
        <EuiButtonEmpty
          size="xs"
          flush="left"
          onClick={() => setIsSummaryExpanded((expanded) => !expanded)}
          aria-expanded={isSummaryExpanded}
          data-test-subj="investigationOutputImpactShowMore"
        >
          {isSummaryExpanded
            ? i18n.translate('xpack.investigationOutput.impact.showLess', {
                defaultMessage: 'Show less',
              })
            : i18n.translate('xpack.investigationOutput.impact.showMore', {
                defaultMessage: 'Show more',
              })}
        </EuiButtonEmpty>
      )}
      {evidence && (
        <>
          {trimmedSummary && <EuiSpacer size="s" />}
          <div data-test-subj="investigationOutputImpactEvidence">
            <EvidenceItem evidence={evidence} />
          </div>
        </>
      )}
      {entities.length > 0 && (
        <>
          {(trimmedSummary || evidence) && <EuiSpacer size="s" />}
          <EuiPanel
            hasBorder
            hasShadow={false}
            paddingSize="none"
            data-test-subj="investigationOutputImpactEntities"
          >
            {entities.map((entity, index) => (
              <ImpactEntityRow
                key={`${entity.name}-${index}`}
                entity={entity}
                isLast={index === entities.length - 1}
              />
            ))}
          </EuiPanel>
        </>
      )}
    </div>
  );
};
