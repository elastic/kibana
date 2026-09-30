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
import { EvidenceChart } from './evidence_chart';
import { EvidenceItem } from './evidence_list';
import { getVisibleImpactParts } from './impact_layout_budget';

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
          <EvidenceItem evidence={entity.evidence} />
        </EuiAccordion>
      ) : (
        <EntityHeader entity={entity} />
      )}
    </EuiPanel>
  );
};

/**
 * What the investigation found was affected: the impact narrative, the evidence backing it (chart
 * first), then the impacted entities in one shared panel. Only as much as fits a rough height
 * budget is shown up front; the rest is behind "Show more".
 */
export const ImpactSection: React.FC<ImpactSectionProps> = ({ impact }) => {
  const { summary, evidence, entities = [] } = impact;
  const [isExpanded, setIsExpanded] = useState(false);
  const hasSummary = Boolean(summary?.trim());
  if (!hasSummary && !evidence && entities.length === 0) {
    return null;
  }

  const visible = getVisibleImpactParts(impact);
  const showEvidenceChart = Boolean(evidence?.chart) && (isExpanded || visible.showEvidenceChart);
  const showEvidenceDescription =
    Boolean(evidence?.description.trim()) && (isExpanded || visible.showEvidenceDescription);
  const shownEntities = isExpanded ? entities : entities.slice(0, visible.visibleEntityCount);
  const showEvidence = showEvidenceChart || showEvidenceDescription;

  return (
    <div data-test-subj="investigationOutputImpact">
      {hasSummary && (
        <EuiMarkdownFormat textSize="s" color="default">
          {summary ?? ''}
        </EuiMarkdownFormat>
      )}
      {evidence && showEvidence && (
        <>
          {hasSummary && <EuiSpacer size="s" />}
          <div data-test-subj="investigationOutputImpactEvidence">
            {showEvidenceChart && evidence.chart && <EvidenceChart chart={evidence.chart} />}
            {showEvidenceChart && showEvidenceDescription && <EuiSpacer size="s" />}
            {showEvidenceDescription && (
              <EuiMarkdownFormat textSize="xs" color="subdued">
                {evidence.description}
              </EuiMarkdownFormat>
            )}
          </div>
        </>
      )}
      {shownEntities.length > 0 && (
        <>
          {(hasSummary || showEvidence) && <EuiSpacer size="s" />}
          <EuiPanel
            hasBorder
            hasShadow={false}
            paddingSize="none"
            data-test-subj="investigationOutputImpactEntities"
          >
            {shownEntities.map((entity, index) => (
              <ImpactEntityRow
                key={`${entity.name}-${index}`}
                entity={entity}
                isLast={index === shownEntities.length - 1}
              />
            ))}
          </EuiPanel>
        </>
      )}
      {visible.isTruncated && (
        <EuiButtonEmpty
          size="xs"
          flush="left"
          onClick={() => setIsExpanded((expanded) => !expanded)}
          aria-expanded={isExpanded}
          data-test-subj="investigationOutputImpactShowMore"
        >
          {isExpanded
            ? i18n.translate('xpack.investigationOutput.impact.showLess', {
                defaultMessage: 'Show less',
              })
            : i18n.translate('xpack.investigationOutput.impact.showMore', {
                defaultMessage: 'Show more',
              })}
        </EuiButtonEmpty>
      )}
    </div>
  );
};
