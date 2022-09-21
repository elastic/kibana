/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiFlexGroup, EuiFlexItem, EuiNotificationBadge } from '@elastic/eui';
import React from 'react';
import styled from 'styled-components';
import { RESPONSE_ACTION_TYPES } from '../../../../common/detection_engine/rule_response_actions/schemas';
import { useIsExperimentalFeatureEnabled } from '../../hooks/use_experimental_features';
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
  const responseActionsEnabled = useIsExperimentalFeatureEnabled('responseActionsEnabled');
  if (!osquery || !rawEventData || !responseActionsEnabled) {
    return;
  }

  const { OsqueryResults } = osquery;
  const parameters = rawEventData.fields['kibana.alert.rule.parameters'];
  const responseActions = parameters?.[0].response_actions;

  const osqueryActionsLength = responseActions?.filter(
    (action: { action_type_id: string }) => action.action_type_id === RESPONSE_ACTION_TYPES.OSQUERY
  )?.length;

  const agentIds = rawEventData.fields['agent.id'];
  const ruleName = rawEventData.fields['kibana.alert.rule.name'];

  const alertId = rawEventData._id;
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
                alertId={alertId}
                addToTimeline={handleAddToTimeline}
              />
            </TabContentWrapper>
          </>
        ),
      }
    : undefined;
};
