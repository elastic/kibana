/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiFlexGroup, EuiFlexItem, EuiTitle } from '@elastic/eui';
import { find } from 'lodash/fp';

import * as i18n from './translations';

import type { BrowserFields } from '../../../containers/source';
import type { TimelineEventsDetailsItem } from '../../../../../common/search_strategy/timeline';
import { hasData } from './helpers';
import { useGetUserCasesPermissions } from '../../../lib/kibana';
import { useIsExperimentalFeatureEnabled } from '../../../hooks/use_experimental_features';
import { useLicense } from '../../../hooks/use_license';
import { RelatedAlertsByProcessAncestry } from './related_alerts_by_process_ancestry';
import { RelatedCases } from './related_cases';
import { RelatedAlertsBySourceEvent } from './related_alerts_by_source_event';
import { RelatedAlertsBySession } from './related_alerts_by_session';
import { RelatedAlertsUpsell } from './related_alerts_upsell';

interface Props {
  browserFields: BrowserFields;
  eventId: string;
  data: TimelineEventsDetailsItem[];
  timelineId: string;
  isReadOnly?: boolean;
}

/**
 * Displays several key insights for the associated alert.
 */
export const Insights = React.memo<Props>(
  ({ browserFields, eventId, data, isReadOnly, timelineId }) => {
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

    const userCasesPermissions = useGetUserCasesPermissions();
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
                timelineId={timelineId}
              />
            </EuiFlexItem>
          )}

          {processSessionField && processSessionField.values && (
            <EuiFlexItem data-test-subj="related-alerts-by-session">
              <RelatedAlertsBySession
                browserFields={browserFields}
                data={processSessionField}
                eventId={eventId}
                timelineId={timelineId}
              />
            </EuiFlexItem>
          )}

          {canShowAncestryInsight &&
            (hasAtLeastPlatinum ? (
              <EuiFlexItem data-test-subj="related-alerts-by-ancestry">
                <RelatedAlertsByProcessAncestry
                  data={processEntityField}
                  originalDocumentId={originalDocumentId}
                  index={originalDocumentIndex}
                  eventId={eventId}
                  timelineId={timelineId}
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

function hasCorrectAgentTypeAndEventModule(
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
