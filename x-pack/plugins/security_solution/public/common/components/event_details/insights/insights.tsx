/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiBetaBadge, EuiFlexGroup, EuiFlexItem, EuiIcon, EuiTitle } from '@elastic/eui';
import { euiStyled } from '@kbn/kibana-react-plugin/common';
import { ALERT_SUPPRESSION_DOCS_COUNT } from '@kbn/rule-data-utils';
import { find } from 'lodash/fp';

import { APP_ID } from '../../../../../common';
import * as i18n from './translations';

import type { BrowserFields } from '../../../containers/source';
import type { TimelineEventsDetailsItem } from '../../../../../common/search_strategy/timeline';
import { hasData } from './helpers';
import { useIsExperimentalFeatureEnabled } from '../../../hooks/use_experimental_features';
import { useLicense } from '../../../hooks/use_license';
import { RelatedAlertsByProcessAncestry } from './related_alerts_by_process_ancestry';
import { RelatedCases } from './related_cases';
import { RelatedAlertsBySourceEvent } from './related_alerts_by_source_event';
import { RelatedAlertsBySession } from './related_alerts_by_session';
import { RelatedAlertsUpsell } from './related_alerts_upsell';
import { useKibana } from '../../../lib/kibana';

const StyledInsightItem = euiStyled(EuiFlexItem)`
  border: 1px solid ${({ theme }) => theme.eui.euiColorLightShade};
  padding: 10px 8px;
  border-radius: 6px;
  display: inline-flex;
`;

interface Props {
  browserFields: BrowserFields;
  eventId: string;
  data: TimelineEventsDetailsItem[];
  scopeId: string;
  isReadOnly?: boolean;
}

/**
 * Displays several key insights for the associated alert.
 */
export const Insights = React.memo<Props>(
  ({ browserFields, eventId, data, isReadOnly, scopeId }) => {
    const { cases } = useKibana().services;
    const isRelatedAlertsByProcessAncestryEnabled = useIsExperimentalFeatureEnabled(
      'insightsRelatedAlertsByProcessAncestry'
    );
    const hasAtLeastPlatinum = useLicense().isPlatinumPlus();
    const originalDocumentId = find(
      { category: 'kibana', field: 'kibana.alert.ancestors.id' },
      data
    );
    const originalDocumentIndex = find(
      { category: 'kibana', field: 'kibana.alert.rule.parameters.index' },
      data
    );
    const agentTypeField = find({ category: 'agent', field: 'agent.type' }, data);
    const eventModuleField = find({ category: 'event', field: 'event.module' }, data);
    const processEntityField = find({ category: 'process', field: 'process.entity_id' }, data);
    const hasProcessEntityInfo =
      hasData(processEntityField) &&
      hasCorrectAgentTypeAndEventModule(agentTypeField, eventModuleField);

    const processSessionField = find(
      { category: 'process', field: 'process.entry_leader.entity_id' },
      data
    );
    const hasProcessSessionInfo =
      isRelatedAlertsByProcessAncestryEnabled && hasData(processSessionField);

    const sourceEventField = find(
      { category: 'kibana', field: 'kibana.alert.original_event.id' },
      data
    );
    const hasSourceEventInfo = hasData(sourceEventField);

    const alertSuppressionField = find(
      { category: 'kibana', field: ALERT_SUPPRESSION_DOCS_COUNT },
      data
    );
    const hasAlertSuppressionField = hasData(alertSuppressionField);

    const userCasesPermissions = cases.helpers.canUseCases([APP_ID]);
    const hasCasesReadPermissions = userCasesPermissions.read;

    // Make sure that the alert has at least one of the associated fields
    // or the user has the required permissions for features/fields that
    // we can provide insights for
    const canShowAtLeastOneInsight =
      hasCasesReadPermissions ||
      hasProcessEntityInfo ||
      hasSourceEventInfo ||
      hasProcessSessionInfo;

    const canShowAncestryInsight =
      isRelatedAlertsByProcessAncestryEnabled &&
      hasProcessEntityInfo &&
      originalDocumentId &&
      originalDocumentIndex;

    // If we're in read-only mode or don't have any insight-related data,
    // don't render anything.
    if (isReadOnly || !canShowAtLeastOneInsight) {
      return null;
    }

    return (
      <div>
        <EuiFlexGroup direction="column" gutterSize="m">
          <EuiFlexItem>
            <EuiTitle size="xxxs">
              <h5>{i18n.INSIGHTS}</h5>
            </EuiTitle>
          </EuiFlexItem>

          {hasAlertSuppressionField && (
            <StyledInsightItem>
              <div>
                <EuiIcon type="layers" style={{ marginLeft: '4px', marginRight: '8px' }} />
                {i18n.SUPPRESSED_ALERTS_COUNT(parseInt(alertSuppressionField.values[0], 10))}
                <EuiBetaBadge
                  label={i18n.SUPPRESSED_ALERTS_COUNT_TECHNICAL_PREVIEW}
                  style={{ verticalAlign: 'middle', marginLeft: '8px' }}
                  size="s"
                />
              </div>
            </StyledInsightItem>
          )}

          {hasCasesReadPermissions && (
            <EuiFlexItem>
              <RelatedCases eventId={eventId} />
            </EuiFlexItem>
          )}

          {sourceEventField && sourceEventField.values && (
            <EuiFlexItem>
              <RelatedAlertsBySourceEvent
                browserFields={browserFields}
                data={sourceEventField}
                eventId={eventId}
                scopeId={scopeId}
              />
            </EuiFlexItem>
          )}

          {processSessionField && processSessionField.values && (
            <EuiFlexItem data-test-subj="related-alerts-by-session">
              <RelatedAlertsBySession
                browserFields={browserFields}
                data={processSessionField}
                eventId={eventId}
                scopeId={scopeId}
              />
            </EuiFlexItem>
          )}

          {canShowAncestryInsight &&
            (hasAtLeastPlatinum ? (
              <EuiFlexItem data-test-subj="related-alerts-by-ancestry">
                <RelatedAlertsByProcessAncestry
                  originalDocumentId={originalDocumentId}
                  index={originalDocumentIndex}
                  eventId={eventId}
                  scopeId={scopeId}
                />
              </EuiFlexItem>
            ) : (
              <EuiFlexItem>
                <RelatedAlertsUpsell />
              </EuiFlexItem>
            ))}
        </EuiFlexGroup>
      </div>
    );
  }
);

export function hasCorrectAgentTypeAndEventModule(
  agentTypeField?: TimelineEventsDetailsItem,
  eventModuleField?: TimelineEventsDetailsItem
): boolean {
  return (
    hasData(agentTypeField) &&
    (agentTypeField.values[0] === 'endpoint' ||
      (agentTypeField.values[0] === 'winlogbeat' &&
        hasData(eventModuleField) &&
        eventModuleField.values[0] === 'sysmon'))
  );
}

Insights.displayName = 'Insights';
