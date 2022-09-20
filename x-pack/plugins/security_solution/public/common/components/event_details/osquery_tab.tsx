/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiFlexGroup, EuiFlexItem, EuiNotificationBadge } from '@elastic/eui';
import React from 'react';
import styled from 'styled-components';
import { expandDottedObject } from '../../../../common/utils/expand_dotted';
import { RESPONSE_ACTION_TYPES } from '../../../../common/detection_engine/rule_response_actions/schemas';
import { useIsExperimentalFeatureEnabled } from '../../hooks/use_experimental_features';
import { useKibana } from '../../lib/kibana';
import { EventsViewType } from './event_details';
import * as i18n from './translations';
import { useHandleAddToTimeline } from './add_to_timeline_button';

const TabContentWrapper = styled.div`
  height: 100%;
  position: relative;
`;
type RuleParameters = Array<{
  response_actions: Array<{
    action_type_id: string;
    params: Record<string, unknown>;
  }>;
}>;

export interface AlertRawEventData {
  _id: string;
  fields: {
    ['agent.id']?: string[];
    ['kibana.alert.rule.parameters']: RuleParameters;
    ['kibana.alert.rule.name']: string[];
  };

  [key: string]: unknown;
}

interface ExpandedEventFieldsObject {
  agent?: {
    id: string[];
  };
  kibana: {
    alert?: {
      rule?: {
        parameters: RuleParameters;
        name: string[];
      };
    };
  };
}

export const useOsqueryTab = ({ rawEventData }: { rawEventData?: AlertRawEventData }) => {
  const {
    services: { osquery },
  } = useKibana();
  const handleAddToTimeline = useHandleAddToTimeline();
  const responseActionsEnabled = useIsExperimentalFeatureEnabled('responseActionsEnabled');
  if (!osquery || !rawEventData || !responseActionsEnabled) {
    return;
  }

  const { OsqueryResults } = osquery;
  const expandedEventFieldsObject = expandDottedObject(
    rawEventData.fields
  ) as ExpandedEventFieldsObject;

  const ruleName = expandedEventFieldsObject.kibana?.alert?.rule?.name;
  const parameters = expandedEventFieldsObject.kibana?.alert?.rule?.parameters;
  const agentIds = expandedEventFieldsObject.agent?.id;
  const responseActions = parameters?.[0].response_actions;

  const osqueryActionsLength = responseActions?.filter(
    (action: { action_type_id: string }) => action.action_type_id === RESPONSE_ACTION_TYPES.OSQUERY
  )?.length;

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
