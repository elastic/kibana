/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo } from 'react';
import {
  EuiBadge,
  EuiButtonIcon,
  EuiDescriptionList,
  EuiFlexGroup,
  EuiFlexItem,
  EuiHorizontalRule,
  EuiText,
  EuiCallOut,
  EuiSkeletonRectangle,
  EuiSpacer,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import type { LensPublicStart } from '@kbn/lens-plugin/public';
import type { DataViewsPublicPluginStart } from '@kbn/data-views-plugin/public';
import type { UiActionsPublicStart } from '@kbn/ui-actions-plugin/public/plugin';
import { CriticalityDonut } from './criticality_donut';
import { DependencyChainMap } from './dependency_chain_map';
import { InfoPanel } from './info_panel';
import { RecommendationsPlanPanel } from './recommendations_plan_panel';
import { RootCausePanel } from './root_cause_panel';
import { SignificantEventDetailHeader } from './significant_event_detail_header';
import { getSeverityFromScore, getRecommendedActionBadgeColor } from './event_utils';
import type { RecommendationStep } from '.';
import { SigEvidenceTrendLens } from './sig_evidence_trend_lens';

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

/** Response shape from POST .../significant_events/evidence_review (Observability Agent Builder). */
export interface SigEventEvidenceReviewResponse {
  readonly status: 'healthy' | 'failing' | 'resolved';
  readonly significantEventId: string;
  readonly trendRange: {
    readonly from: string;
    readonly to: string;
    readonly bucketMinutes: number;
  };
  readonly evidenceItems: ReadonlyArray<{
    readonly ruleName: string;
    readonly lastSeen: string | null;
    readonly trend:
      | { success: true; lensVisualization: Record<string, unknown> }
      | { success: false; error: string };
  }>;
  readonly signals: {
    readonly evidenceRowHits: number;
    readonly eligibleEvidenceCount: number;
    readonly evidenceQueriesWithMatches: number;
  };
}

export interface SignificantEventDetailEvidenceReviewProps {
  readonly runReview: () => void;
  readonly isLoading: boolean;
  readonly status?: SigEventEvidenceReviewResponse;
  readonly error?: string;
}

export interface SignificantEventDetailFields {
  id: string;
  label: string;
  subtitle: string;
  summary: string;
  rootCause: string;
  recommendations: string[];
  recommendedAction: 'escalate' | 'monitor' | 'resolve' | 'investigate';
  criticality: number;
  ruleNames: string[];
  streamNames: string[];
  evidences: EvidenceItem[];
  dependencyEdges: DependencyEdgeItem[];
  causeKis: CauseKiItem[];
  timestamp: string;
}

export interface SignificantEventDetailBodyProps {
  /** Required to render evidence trend Lens charts inside the optional evidence review panel. */
  services?: {
    lens: LensPublicStart;
    dataViews: DataViewsPublicPluginStart;
    uiActions: UiActionsPublicStart;
  };
  event: SignificantEventDetailFields;
  detectedAtLabel?: string;
  hideHeader?: boolean;
  onRemediate?: () => void;
  onOpenDetails?: () => void;
  /** Live evidence re-check + trends; typically passed from the Observability significant-events page. */
  evidenceReview?: SignificantEventDetailEvidenceReviewProps;
}

const safeRuleTestSubjId = (ruleName: string) =>
  ruleName.replace(/[^a-zA-Z0-9_-]+/g, '-').slice(0, 80);

export function SignificantEventDetailBody(props: SignificantEventDetailBodyProps) {
  const {
    event: rawEvent,
    detectedAtLabel,
    hideHeader = false,
    onRemediate,
    onOpenDetails,
    services,
    evidenceReview,
  } = props;

  const event = useMemo<SignificantEventDetailFields>(
    () => ({
      ...rawEvent,
      dependencyEdges: rawEvent.dependencyEdges ?? [],
      recommendations: Array.isArray(rawEvent.recommendations) ? rawEvent.recommendations : [],
      evidences: rawEvent.evidences ?? [],
      causeKis: rawEvent.causeKis ?? [],
      ruleNames: Array.isArray(rawEvent.ruleNames) ? rawEvent.ruleNames : [],
      streamNames: Array.isArray(rawEvent.streamNames) ? rawEvent.streamNames : [],
    }),
    [rawEvent]
  );

  const severity = useMemo(() => getSeverityFromScore(event.criticality), [event.criticality]);

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
    'xpack.nightshift.sigeventsOverview.sigEvents.childSummaryTitle',
    { defaultMessage: 'Summary' }
  );

  const generalInfoTitle = i18n.translate(
    'xpack.nightshift.sigeventsOverview.sigEvents.childGeneralInfoTitle',
    { defaultMessage: 'General information' }
  );

  const generalInfoDescriptionItems = useMemo(() => {
    return [
      {
        title: i18n.translate(
          'xpack.nightshift.sigeventsOverview.sigEvents.childGeneralTermSeverity',
          { defaultMessage: 'Severity' }
        ),
        description: (
          <EuiFlexGroup alignItems="center" gutterSize="s" responsive={false}>
            <EuiFlexItem grow={false}>
              <EuiBadge color={severity.badgeColor}>{severity.label}</EuiBadge>
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <CriticalityDonut score={event.criticality} size={32} strokeWidth={6} />
            </EuiFlexItem>
          </EuiFlexGroup>
        ),
      },
      {
        title: i18n.translate(
          'xpack.nightshift.sigeventsOverview.sigEvents.childGeneralTermImpacting',
          { defaultMessage: 'Impacting' }
        ),
        description: impactingLabel,
      },
      {
        title: i18n.translate(
          'xpack.nightshift.sigeventsOverview.sigEvents.childGeneralTermRecommendedAction',
          { defaultMessage: 'Recommended action' }
        ),
        description: (
          <EuiBadge color="warning" iconType={recommendedActionIconType}>
            {recommendedActionLabel}
          </EuiBadge>
        ),
      },
      {
        title: i18n.translate(
          'xpack.nightshift.sigeventsOverview.sigEvents.childGeneralTermStream',
          { defaultMessage: 'Stream' }
        ),
        description: event.streamNames.join(', '),
      },
      {
        title: i18n.translate(
          'xpack.nightshift.sigeventsOverview.sigEvents.childGeneralTermRules',
          { defaultMessage: 'Rules' }
        ),
        description: event.ruleNames.join(', '),
      },
    ];
  }, [
    event.criticality,
    event.ruleNames,
    event.streamNames,
    impactingLabel,
    recommendedActionIconType,
    recommendedActionLabel,
    severity.badgeColor,
    severity.label,
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

  const trendByRuleName = useMemo(() => {
    const map = new Map<string, SigEventEvidenceReviewResponse['evidenceItems'][number]>();
    if (evidenceReview?.status) {
      for (const item of evidenceReview.status.evidenceItems) {
        map.set(item.ruleName, item);
      }
    }
    return map;
  }, [evidenceReview?.status]);

  const evidenceHeaderRight = useMemo(() => {
    if (!evidenceReview) return undefined;

    return (
      <EuiFlexGroup alignItems="center" gutterSize="s" responsive={false}>
        {evidenceReview.status ? (
          <EuiFlexItem grow={false}>
            <EuiText size="xs" color="subdued">
              {i18n.translate('xpack.nightshift.sigeventsOverview.evidence.aggregateHint', {
                defaultMessage: '{matchingRules}/{eligibleRules} rules match',
                values: {
                  matchingRules: evidenceReview.status.signals.evidenceQueriesWithMatches,
                  eligibleRules: evidenceReview.status.signals.eligibleEvidenceCount,
                },
              })}
            </EuiText>
          </EuiFlexItem>
        ) : null}
        <EuiFlexItem grow={false}>
          <EuiButtonIcon
            iconType="refresh"
            size="xs"
            color="text"
            isLoading={evidenceReview.isLoading}
            onClick={(e: React.MouseEvent) => {
              e.stopPropagation();
              evidenceReview.runReview();
            }}
            aria-label={i18n.translate('xpack.nightshift.sigeventsOverview.evidence.refreshAria', {
              defaultMessage: 'Refresh evidence trends',
            })}
            data-test-subj="obltSigeventsEvidenceRefreshButton"
          />
        </EuiFlexItem>
      </EuiFlexGroup>
    );
  }, [evidenceReview]);

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
            severityScore={event.criticality}
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
              'xpack.nightshift.sigeventsOverview.sigEvents.dependenciesTitle',
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
            title={i18n.translate('xpack.nightshift.sigeventsOverview.sigEvents.evidenceTitle', {
              defaultMessage: 'Evidence',
            })}
            headerRightContent={evidenceHeaderRight}
          >
            <EuiFlexGroup direction="column" gutterSize="m">
              {event.evidences.map((evidence, idx) => {
                const trendItem = trendByRuleName.get(evidence.ruleName);
                const ruleId = safeRuleTestSubjId(evidence.ruleName);

                return (
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
                              {i18n.translate(
                                'xpack.nightshift.sigeventsOverview.evidence.rowSummary',
                                {
                                  defaultMessage: '{rowCount} rows · {ruleName} · {streamName}',
                                  values: {
                                    rowCount: evidence.rowCount,
                                    ruleName: evidence.ruleName,
                                    streamName: evidence.streamName,
                                  },
                                }
                              )}
                            </EuiText>
                          </EuiFlexItem>
                        </EuiFlexGroup>
                      </EuiFlexItem>
                      <EuiFlexItem grow={false}>
                        <EuiText size="s">
                          <p>{evidence.description}</p>
                        </EuiText>
                      </EuiFlexItem>
                      {evidenceReview?.isLoading && !trendItem ? (
                        <EuiFlexItem grow={false}>
                          <EuiSpacer size="s" />
                          <EuiSkeletonRectangle
                            width="100%"
                            height={200}
                            borderRadius="s"
                            isLoading
                          />
                        </EuiFlexItem>
                      ) : null}
                      {trendItem && evidenceReview?.status ? (
                        <EuiFlexItem
                          grow={false}
                          data-test-subj={`obltSigeventsEvidenceTrend-${ruleId}`}
                        >
                          <EuiSpacer size="s" />
                          {trendItem.trend.success === false ? (
                            <EuiCallOut
                              announceOnMount={false}
                              color="warning"
                              size="s"
                              title={trendItem.trend.error}
                            />
                          ) : services ? (
                            <SigEvidenceTrendLens
                              lensConfig={trendItem.trend.lensVisualization}
                              rangeFrom={evidenceReview.status.trendRange.from}
                              rangeTo={evidenceReview.status.trendRange.to}
                              services={services}
                            />
                          ) : null}
                        </EuiFlexItem>
                      ) : null}
                      <EuiFlexItem grow={false}>
                        <EuiText size="xs" color="subdued">
                          <code>{evidence.esqlQuery}</code>
                        </EuiText>
                      </EuiFlexItem>
                    </EuiFlexGroup>
                    {idx < event.evidences.length - 1 ? <EuiHorizontalRule margin="s" /> : null}
                  </EuiFlexItem>
                );
              })}
            </EuiFlexGroup>
            {evidenceReview?.error ? (
              <>
                <EuiSpacer size="s" />
                <EuiCallOut color="danger" size="s" title={evidenceReview.error} announceOnMount />
              </>
            ) : null}
          </InfoPanel>
        </EuiFlexItem>
      ) : null}

      {event.causeKis.length > 0 ? (
        <EuiFlexItem grow={false}>
          <InfoPanel
            title={i18n.translate('xpack.nightshift.sigeventsOverview.sigEvents.causeKisTitle', {
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
          escalateBadgeColor={getRecommendedActionBadgeColor(event.recommendedAction)}
          escalateBadgeIconType={recommendedActionIconType}
          onRemediate={onRemediate}
          onOpenDetails={onOpenDetails}
        />
      </EuiFlexItem>
    </EuiFlexGroup>
  );
}
