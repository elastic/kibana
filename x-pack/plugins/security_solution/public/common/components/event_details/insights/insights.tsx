/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiFlexGroup, EuiFlexItem, EuiTitle } from '@elastic/eui';
import { find } from 'lodash/fp';

import * as i18n from '../translations';

import type { TimelineEventsDetailsItem } from '../../../../../common/search_strategy/timeline';
import { useGetUserCasesPermissions } from '../../../lib/kibana';
import { RelatedAlertsByProcessAncestry } from './related_alerts_by_process_ancestry';
import { RelatedCases } from './related_cases';
import { RelatedAlertsBySourceEvent } from './related_alerts_by_source_event';
import { RelatedAlertsBySession } from './related_alerts_by_session';

interface Props {
  eventId: string;
  data: TimelineEventsDetailsItem[];
  isReadOnly?: boolean;
  timelineId?: string;
}

export const Insights = React.memo<Props>(({ eventId, data, isReadOnly, timelineId }) => {
  const processEntityField = find({ category: 'process', field: 'process.entity_id' }, data);
  const hasProcessEntityInfo = processEntityField && processEntityField.values;

  const processSessionField = find(
    { category: 'process', field: 'process.entry_leader.entity_id' },
    data
  );
  const hasProcessSessionInfo = processSessionField && processSessionField.values;

  const sourceEventField = find(
    { category: 'kibana', field: 'kibana.alert.original_event.id' },
    data
  );
  const hasSourceEventInfo = sourceEventField && sourceEventField.values;

  const userCasesPermissions = useGetUserCasesPermissions();
  const hasCasesReadPermissions = userCasesPermissions.read;

  const canShowAtLeastOneInsight =
    hasCasesReadPermissions || hasProcessEntityInfo || hasSourceEventInfo || hasProcessSessionInfo;

  if (isReadOnly || !canShowAtLeastOneInsight) {
    return null;
  }

  return (
    <div>
      <EuiFlexGroup direction="column" gutterSize="s">
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
            <RelatedAlertsBySourceEvent data={sourceEventField} timelineId={timelineId} />
          </EuiFlexItem>
        )}

        {processEntityField && processEntityField.values && (
          <EuiFlexItem>
            <RelatedAlertsByProcessAncestry
              data={processEntityField}
              eventId={eventId}
              timelineId={timelineId}
            />
          </EuiFlexItem>
        )}

        {processSessionField && processSessionField.values && (
          <EuiFlexItem>
            <RelatedAlertsBySession data={processSessionField} timelineId={timelineId} />
          </EuiFlexItem>
        )}
      </EuiFlexGroup>
    </div>
  );
});

Insights.displayName = 'Insights';
