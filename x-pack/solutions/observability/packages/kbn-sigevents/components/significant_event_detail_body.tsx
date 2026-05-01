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
  EuiHealth,
  EuiHorizontalRule,
  EuiText,
} from '@elastic/eui';
import type { EuiBadgeProps, EuiHealthProps, EuiIconProps } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { InfoPanel } from './info_panel';
import { RecommendationsPlanPanel } from './recommendations_plan_panel';
import { RootCausePanel } from './root_cause_panel';
import { SignificantEventDetailHeader } from './significant_event_detail_header';
import { DevModePlaceholder } from './dev_mode_placeholder';
import type { RecommendationStep } from '.';

export interface SignificantEventDetailFields {
  id: string;
  label: string;
  subtitle: string;
  severityLabel: string;
  severityColor: EuiBadgeProps['color'];
}

export interface SignificantEventDetailBodyProps {
  event: SignificantEventDetailFields;
  detectedAtLabel?: string;
  hideHeader?: boolean;
  criticalityLabel?: string;
  criticalityColor?: EuiHealthProps['color'];
  impactLabel?: string;
  impactColor?: EuiBadgeProps['color'];
  recommendedActionLabel?: string;
  recommendedActionIconType?: EuiIconProps['type'];
  confidenceLabel?: string;
  impactingLabel?: string;
  recommendationSteps?: RecommendationStep[];
  onRemediate?: () => void;
  onOpenDetails?: () => void;
}

const DEFAULT_CRITICALITY_LABEL = i18n.translate(
  'xpack.observability.sigeventsOverview.sigEvents.defaultCriticalityLabel',
  { defaultMessage: 'High' }
);

const DEFAULT_IMPACT_LABEL = i18n.translate(
  'xpack.observability.sigeventsOverview.sigEvents.defaultImpactLabel',
  { defaultMessage: 'High' }
);

const DEFAULT_CONFIDENCE_LABEL = i18n.translate(
  'xpack.observability.sigeventsOverview.sigEvents.defaultConfidenceLabel',
  { defaultMessage: 'High (95%)' }
);

const DEFAULT_IMPACTING_LABEL = i18n.translate(
  'xpack.observability.sigeventsOverview.sigEvents.defaultImpactingLabel',
  { defaultMessage: '4 services' }
);

export function SignificantEventDetailBody(props: SignificantEventDetailBodyProps) {
  const {
    event,
    detectedAtLabel,
    hideHeader = false,
    criticalityLabel = DEFAULT_CRITICALITY_LABEL,
    criticalityColor,
    impactLabel = DEFAULT_IMPACT_LABEL,
    impactColor = 'danger',
    recommendedActionLabel,
    recommendedActionIconType,
    confidenceLabel = DEFAULT_CONFIDENCE_LABEL,
    impactingLabel = DEFAULT_IMPACTING_LABEL,
    recommendationSteps,
    onRemediate,
    onOpenDetails,
  } = props;

  const hasPlaceholderData =
    props.criticalityLabel === undefined ||
    props.impactLabel === undefined ||
    props.confidenceLabel === undefined ||
    props.impactingLabel === undefined;
  const summaryPanelTitle = i18n.translate(
    'xpack.observability.sigeventsOverview.sigEvents.childSummaryTitle',
    { defaultMessage: 'Summary' }
  );

  const generalInfoTitle = i18n.translate(
    'xpack.observability.sigeventsOverview.sigEvents.childGeneralInfoTitle',
    { defaultMessage: 'General information' }
  );

  const summaryBody = useMemo(
    () =>
      i18n.translate('xpack.observability.sigeventsOverview.sigEvents.childSummaryBody', {
        defaultMessage:
          'This signal was raised on {stream}. {title} reflects a statistically significant deviation from the expected pattern for the selected window—review downstream dependencies and blast radius before changes propagate.',
        values: { stream: event.subtitle, title: event.label },
      }),
    [event.label, event.subtitle]
  );

  const resolvedCriticalityColor: EuiHealthProps['color'] = useMemo(() => {
    if (criticalityColor) return criticalityColor;
    if (event.severityColor === 'danger') return 'danger';
    if (event.severityColor === 'warning') return 'warning';
    if (event.severityColor === 'success') return 'success';
    return 'subdued';
  }, [criticalityColor, event.severityColor]);

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
        description: <EuiHealth color={resolvedCriticalityColor}>{criticalityLabel}</EuiHealth>,
      },
      {
        title: i18n.translate(
          'xpack.observability.sigeventsOverview.sigEvents.childGeneralTermConfidence',
          { defaultMessage: 'Confidence' }
        ),
        description: confidenceLabel,
      },
      {
        title: i18n.translate(
          'xpack.observability.sigeventsOverview.sigEvents.childGeneralTermImpact',
          { defaultMessage: 'Impact' }
        ),
        description: <EuiBadge color={impactColor}>{impactLabel}</EuiBadge>,
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
          'xpack.observability.sigeventsOverview.sigEvents.childGeneralTermStream',
          { defaultMessage: 'Stream' }
        ),
        description: event.subtitle,
      },
    ];
  }, [
    confidenceLabel,
    criticalityLabel,
    event.severityColor,
    event.severityLabel,
    event.subtitle,
    impactColor,
    impactLabel,
    impactingLabel,
    resolvedCriticalityColor,
  ]);

  return (
    <DevModePlaceholder hasPlaceholderData={hasPlaceholderData}>
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
              criticalityColor={resolvedCriticalityColor}
              impactLabel={impactLabel}
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
              <p>{summaryBody}</p>
            </EuiText>
          </InfoPanel>
        </EuiFlexItem>

        <EuiFlexItem grow={false}>
          <RootCausePanel />
        </EuiFlexItem>

        <EuiFlexItem grow={false}>
          <RecommendationsPlanPanel
            steps={recommendationSteps}
            onRemediate={onRemediate}
            onOpenDetails={onOpenDetails}
          />
        </EuiFlexItem>
      </EuiFlexGroup>
    </DevModePlaceholder>
  );
}
