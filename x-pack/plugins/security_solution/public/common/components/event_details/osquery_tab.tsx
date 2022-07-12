/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiFlexGroup, EuiFlexItem, EuiNotificationBadge } from '@elastic/eui';
import React from 'react';
import styled from 'styled-components';
import { useKibana } from '../../lib/kibana';
import type { AlertRawEventData } from './event_details';
import { EventsViewType } from './event_details';
import * as i18n from './translations';
import { useHandleAddToTimeline } from './add_to_timeline_button';

const TabContentWrapper = styled.div`
  height: 100%;
  position: relative;
`;

export const useOsqueryTab = ({
  rawEventData,
  id,
}: {
  rawEventData?: AlertRawEventData;
  id: string;
}) => {
  const {
    services: { osquery },
  } = useKibana();
  const handleAddToTimeline = useHandleAddToTimeline();

  if (!osquery) {
    return;
  }

  const { OsqueryResults } = osquery;
  const osqueryActionsLength = rawEventData?._source['kibana.alert.rule.actions']?.filter(
    (action: { action_type_id: string }) => action.action_type_id === '.osquery'
  )?.length;

  const agentIds = rawEventData?.fields['agent.id'];
  const ruleName = rawEventData?._source['kibana.alert.rule.name'];
  const ruleActions = rawEventData?._source['kibana.alert.rule.actions'];

  return osqueryActionsLength
    ? {
        id: EventsViewType.osqueryView,
        'data-test-subj': 'osqueryViewTab',
        name: (
          <EuiFlexGroup
            direction="row"
            alignItems={'center'}
            justifyContent={'spaceAround'}
            gutterSize="xs"
          >
            <EuiFlexItem>
              <span>{i18n.OSQUERY_VIEW}</span>
            </EuiFlexItem>
            <EuiFlexItem>
              <EuiNotificationBadge data-test-subj="osquery-actions-notification">
                {osqueryActionsLength}
              </EuiNotificationBadge>
            </EuiFlexItem>
          </EuiFlexGroup>
        ),
        content: (
          <>
            <TabContentWrapper data-test-subj="osqueryViewWrapper">
              <OsqueryResults
                agentIds={agentIds}
                ruleName={ruleName}
                ruleActions={ruleActions}
                eventDetailId={id}
                addToTimeline={handleAddToTimeline}
              />
            </TabContentWrapper>
          </>
        ),
      }
    : undefined;
};
