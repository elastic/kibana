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
  EuiPanel,
  EuiSpacer,
  EuiText,
  useGeneratedHtmlId,
} from '@elastic/eui';
import type {
  InvestigationImpact,
  InvestigationImpactEntity,
} from '@kbn/significant-events-schema';
import { EvidenceItem } from './evidence_list';
import { EvidenceMarkdown } from './evidence_markdown';

export interface ImpactSectionProps {
  impact: InvestigationImpact;
}

const EntityHeader: React.FC<{ entity: InvestigationImpactEntity }> = ({ entity }) => (
  <EuiFlexGroup alignItems="center" gutterSize="s" responsive={false}>
    <EuiFlexItem grow={false}>
      <EuiText size="s">
        <strong>{entity.name}</strong>
      </EuiText>
    </EuiFlexItem>
    {entity.type && (
      <EuiFlexItem grow={false}>
        <EuiBadge color="hollow">{entity.type}</EuiBadge>
      </EuiFlexItem>
    )}
  </EuiFlexGroup>
);

/** One impacted entity; its evidence is collapsed by default so the impact summary leads. */
const ImpactEntity: React.FC<{ entity: InvestigationImpactEntity }> = ({ entity }) => {
  const accordionId = useGeneratedHtmlId({ prefix: 'investigationImpactEntity' });

  return (
    <EuiPanel hasBorder hasShadow={false} paddingSize="s">
      {entity.evidence ? (
        <EuiAccordion
          id={accordionId}
          buttonContent={<EntityHeader entity={entity} />}
          paddingSize="none"
          data-test-subj="investigationOutputImpactEntityAccordion"
        >
          <EuiSpacer size="xs" />
          <EvidenceItem evidence={entity.evidence} />
        </EuiAccordion>
      ) : (
        <EntityHeader entity={entity} />
      )}
    </EuiPanel>
  );
};

/**
 * What the investigation found was affected: the impact narrative and the evidence backing it,
 * then any impacted entities with the evidence that ties each of them to the incident.
 */
export const ImpactSection: React.FC<ImpactSectionProps> = ({
  impact: { summary, evidence, entities = [] },
}) => {
  const hasSummary = Boolean(summary?.trim());
  if (!hasSummary && !evidence && entities.length === 0) {
    return null;
  }

  return (
    <div data-test-subj="investigationOutputImpact">
      {hasSummary && (
        <EvidenceMarkdown textSize="s" color="default">
          {summary ?? ''}
        </EvidenceMarkdown>
      )}
      {evidence && (
        <>
          {hasSummary && <EuiSpacer size="s" />}
          <div data-test-subj="investigationOutputImpactEvidence">
            <EvidenceItem evidence={evidence} />
          </div>
        </>
      )}
      {entities.length > 0 && (
        <>
          {(hasSummary || evidence) && <EuiSpacer size="s" />}
          <EuiFlexGroup direction="column" gutterSize="s" responsive={false}>
            {entities.map((entity, index) => (
              <EuiFlexItem
                key={`${entity.name}-${index}`}
                grow={false}
                data-test-subj="investigationOutputImpactEntity"
              >
                <ImpactEntity entity={entity} />
              </EuiFlexItem>
            ))}
          </EuiFlexGroup>
        </>
      )}
    </div>
  );
};
