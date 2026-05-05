/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo } from 'react';
import {
  EuiBadge,
  EuiDescriptionList,
  EuiFlexGroup,
  EuiFlexItem,
  EuiHorizontalRule,
  EuiText,
} from '@elastic/eui';
import type { EuiBadgeProps } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { DependencyChainMap } from './dependency_chain_map';
import { InfoPanel } from './info_panel';
import { RecommendationsPlanPanel } from './recommendations_plan_panel';
import { RootCausePanel } from './root_cause_panel';
import { SignificantEventDetailHeader } from './significant_event_detail_header';
import type { RecommendationStep } from '.';

export interface EvidenceItem {
  description: string;
  esqlQuery: string;
  result: string;
  rowCount: number;
  collectedAt: string;
  ruleName: string;
  streamName: string;
  confirmed?: boolean;
}

export interface DependencyEdgeItem {
  source: string;
  target: string;
  protocol: string;
  exposure: 'exposed' | 'not_exposed';
}

export interface CauseKiItem {
  name: string;
  streamName: string;
}

export interface SignificantEventDetailFields {
  id: string;
  label: string;
  subtitle: string;
  severityLabel: string;
  severityColor: EuiBadgeProps['color'];
  summary: string;
  rootCause: string;
  recommendations: string[];
  recommendedAction: 'escalate' | 'monitor' | 'resolve' | 'investigate';
  criticality: number;
  impact: string;
  ruleNames: string[];
  streamNames: string[];
  evidences: EvidenceItem[];
  dependencyEdges: DependencyEdgeItem[];
  causeKis: CauseKiItem[];
  timestamp: string;
}

export interface SignificantEventDetailBodyProps {
  event: SignificantEventDetailFields;
  detectedAtLabel?: string;
  hideHeader?: boolean;
  onRemediate?: () => void;
  onOpenDetails?: () => void;
}

export function SignificantEventDetailBody(props: SignificantEventDetailBodyProps) {
  const {
    event: rawEvent,
    detectedAtLabel,
    hideHeader = false,
    onRemediate,
    onOpenDetails,
  } = props;

  const event = useMemo<SignificantEventDetailFields>(
    () => ({
      ...rawEvent,
      dependencyEdges: rawEvent.dependencyEdges ?? [],
      recommendations: rawEvent.recommendations ?? [],
      evidences: rawEvent.evidences ?? [],
      causeKis: rawEvent.causeKis ?? [],
      ruleNames: rawEvent.ruleNames ?? [],
      streamNames: rawEvent.streamNames ?? [],
    }),
    [rawEvent]
  );

  const impactColor: EuiBadgeProps['color'] = useMemo(() => {
    if (event.severityColor === 'danger') return 'danger';
    if (event.severityColor === 'warning') return 'warning';
    return 'primary';
  }, [event.severityColor]);

  const criticalityColor: EuiBadgeProps['color'] = useMemo(() => {
    if (event.criticality >= 80) return 'danger';
    if (event.criticality >= 60) return 'warning';
    return 'hollow';
  }, [event.criticality]);

  const criticalityLabel = useMemo(() => {
    if (event.criticality >= 80) return 'Critical';
    if (event.criticality >= 60) return 'High';
    if (event.criticality >= 40) return 'Medium';
    return 'Low';
  }, [event.criticality]);

  const impactingLabel = useMemo(() => {
    const exposedEdges = event.dependencyEdges.filter((e) => e.exposure === 'exposed');
    if (exposedEdges.length === 0) return '—';
    const serviceNames = new Set<string>();
    for (const edge of exposedEdges) {
      serviceNames.add(edge.source);
    }
    return `${serviceNames.size} ${serviceNames.size === 1 ? 'service' : 'services'}`;
  }, [event.dependencyEdges]);

  const recommendedActionLabel = useMemo(() => {
    switch (event.recommendedAction) {
      case 'escalate':
        return 'Escalate';
      case 'monitor':
        return 'Monitor';
      case 'resolve':
        return 'Resolve';
      case 'investigate':
        return 'Investigate';
      default:
        return event.recommendedAction;
    }
  }, [event.recommendedAction]);

  const recommendedActionIconType = useMemo(() => {
    switch (event.recommendedAction) {
      case 'escalate':
        return 'warning';
      case 'monitor':
        return 'eye';
      case 'resolve':
        return 'checkInCircleFilled';
      case 'investigate':
        return 'search';
      default:
        return 'questionInCircle';
    }
  }, [event.recommendedAction]);

  const summaryPanelTitle = i18n.translate(
    'xpack.observability.sigeventsOverview.sigEvents.childSummaryTitle',
    { defaultMessage: 'Summary' }
  );

  const generalInfoTitle = i18n.translate(
    'xpack.observability.sigeventsOverview.sigEvents.childGeneralInfoTitle',
    { defaultMessage: 'General information' }
  );

  const generalInfoDescriptionItems = useMemo(() => {
    return [
      {
        title: i18n.translate(
          'xpack.observability.sigeventsOverview.sigEvents.childGeneralTermSeverity',
          { defaultMessage: 'Severity' }
        ),
        description: <EuiBadge color={event.severityColor}>{event.severityLabel}</EuiBadge>,
      },
      {
        title: i18n.translate(
          'xpack.observability.sigeventsOverview.sigEvents.childGeneralTermCriticality',
          { defaultMessage: 'Criticality' }
        ),
        description: (
          <EuiBadge color={criticalityColor}>
            {criticalityLabel} ({event.criticality})
          </EuiBadge>
        ),
      },
      {
        title: i18n.translate(
          'xpack.observability.sigeventsOverview.sigEvents.childGeneralTermImpact',
          { defaultMessage: 'Impact' }
        ),
        description: <EuiBadge color={impactColor}>{event.impact}</EuiBadge>,
      },
      {
        title: i18n.translate(
          'xpack.observability.sigeventsOverview.sigEvents.childGeneralTermImpacting',
          { defaultMessage: 'Impacting' }
        ),
        description: impactingLabel,
      },
      {
        title: i18n.translate(
          'xpack.observability.sigeventsOverview.sigEvents.childGeneralTermRecommendedAction',
          { defaultMessage: 'Recommended action' }
        ),
        description: <EuiBadge color={impactColor}>{recommendedActionLabel}</EuiBadge>,
      },
      {
        title: i18n.translate(
          'xpack.observability.sigeventsOverview.sigEvents.childGeneralTermStream',
          { defaultMessage: 'Stream' }
        ),
        description: event.streamNames.join(', '),
      },
      {
        title: i18n.translate(
          'xpack.observability.sigeventsOverview.sigEvents.childGeneralTermRules',
          { defaultMessage: 'Rules' }
        ),
        description: event.ruleNames.join(', '),
      },
    ];
  }, [
    criticalityColor,
    criticalityLabel,
    event.criticality,
    event.impact,
    event.ruleNames,
    event.severityColor,
    event.severityLabel,
    event.streamNames,
    impactColor,
    impactingLabel,
    recommendedActionLabel,
  ]);

  const recommendationSteps: RecommendationStep[] = useMemo(
    () =>
      event.recommendations.map((rec, idx) => ({
        id: String(idx + 1),
        title: rec.length > 80 ? rec.slice(0, 77) + '...' : rec,
        description: rec,
      })),
    [event.recommendations]
  );

  return (
    <EuiFlexGroup
      direction="column"
      gutterSize="m"
      data-test-subj="sigeventsOverviewSignificantEventDetailBody"
    >
      {!hideHeader ? (
        <EuiFlexItem grow={false}>
          <SignificantEventDetailHeader
            title={event.label}
            detectedAtLabel={detectedAtLabel}
            severityLabel={event.severityLabel}
            severityColor={event.severityColor}
            criticalityLabel={criticalityLabel}
            criticalityColor={criticalityColor}
            impactLabel={event.impact}
            impactColor={impactColor}
            recommendedActionLabel={recommendedActionLabel}
            recommendedActionIconType={recommendedActionIconType}
          />
        </EuiFlexItem>
      ) : null}

      <EuiFlexItem grow={false}>
        <InfoPanel title={generalInfoTitle} collapsible initialCollapsed>
          {generalInfoDescriptionItems.map((listItem, index) => (
            <React.Fragment key={listItem.title}>
              <EuiDescriptionList
                type="column"
                columnWidths={[1, 2]}
                compressed
                listItems={[listItem]}
              />
              {index < generalInfoDescriptionItems.length - 1 ? (
                <EuiHorizontalRule margin="m" />
              ) : null}
            </React.Fragment>
          ))}
        </InfoPanel>
      </EuiFlexItem>

      <EuiFlexItem grow={false}>
        <InfoPanel title={summaryPanelTitle}>
          <EuiText size="s">
            <p>{event.summary}</p>
          </EuiText>
        </InfoPanel>
      </EuiFlexItem>

      {event.dependencyEdges.length > 0 ? (
        <EuiFlexItem grow={false}>
          <InfoPanel
            title={i18n.translate(
              'xpack.observability.sigeventsOverview.sigEvents.dependenciesTitle',
              { defaultMessage: 'Dependency chain' }
            )}
          >
            <DependencyChainMap dependencyEdges={event.dependencyEdges} causeKis={event.causeKis} />
          </InfoPanel>
        </EuiFlexItem>
      ) : null}

      <EuiFlexItem grow={false}>
        <RootCausePanel>
          <p>{event.rootCause}</p>
        </RootCausePanel>
      </EuiFlexItem>

      {event.evidences.length > 0 ? (
        <EuiFlexItem grow={false}>
          <InfoPanel
            title={i18n.translate('xpack.observability.sigeventsOverview.sigEvents.evidenceTitle', {
              defaultMessage: 'Evidence',
            })}
            collapsible
          >
            <EuiFlexGroup direction="column" gutterSize="m">
              {event.evidences.map((evidence, idx) => (
                <EuiFlexItem key={idx} grow={false}>
                  <EuiFlexGroup direction="column" gutterSize="xs">
                    <EuiFlexItem grow={false}>
                      <EuiFlexGroup gutterSize="xs" alignItems="center" responsive={false} wrap>
                        <EuiFlexItem grow={false}>
                          <EuiBadge color={evidence.confirmed ? 'success' : 'hollow'}>
                            {evidence.confirmed ? 'confirmed' : evidence.result}
                          </EuiBadge>
                        </EuiFlexItem>
                        <EuiFlexItem grow={false}>
                          <EuiText size="xs" color="subdued">
                            {evidence.rowCount} rows · {evidence.ruleName} · {evidence.streamName}
                          </EuiText>
                        </EuiFlexItem>
                      </EuiFlexGroup>
                    </EuiFlexItem>
                    <EuiFlexItem grow={false}>
                      <EuiText size="s">
                        <p>{evidence.description}</p>
                      </EuiText>
                    </EuiFlexItem>
                    <EuiFlexItem grow={false}>
                      <EuiText size="xs" color="subdued">
                        <code>{evidence.esqlQuery}</code>
                      </EuiText>
                    </EuiFlexItem>
                  </EuiFlexGroup>
                  {idx < event.evidences.length - 1 ? <EuiHorizontalRule margin="s" /> : null}
                </EuiFlexItem>
              ))}
            </EuiFlexGroup>
          </InfoPanel>
        </EuiFlexItem>
      ) : null}

      {event.causeKis.length > 0 ? (
        <EuiFlexItem grow={false}>
          <InfoPanel
            title={i18n.translate('xpack.observability.sigeventsOverview.sigEvents.causeKisTitle', {
              defaultMessage: 'Causal entities',
            })}
            collapsible
          >
            <EuiDescriptionList
              type="column"
              columnWidths={[1, 2]}
              compressed
              listItems={event.causeKis.map((ki) => ({
                title: ki.name,
                description: ki.streamName,
              }))}
            />
          </InfoPanel>
        </EuiFlexItem>
      ) : null}

      <EuiFlexItem grow={false}>
        <RecommendationsPlanPanel
          steps={recommendationSteps}
          escalateBadgeLabel={recommendedActionLabel}
          escalateBadgeColor={impactColor}
          escalateBadgeIconType={recommendedActionIconType}
          onRemediate={onRemediate}
          onOpenDetails={onOpenDetails}
        />
      </EuiFlexItem>
    </EuiFlexGroup>
  );
}
