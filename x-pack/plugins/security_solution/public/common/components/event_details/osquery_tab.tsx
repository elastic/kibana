/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiCode,
  EuiEmptyPrompt,
  EuiFlexGroup,
  EuiFlexItem,
  EuiNotificationBadge,
} from '@elastic/eui';
import React, { useMemo } from 'react';
import styled from 'styled-components';
import { FormattedMessage } from '@kbn/i18n-react';
import type { Ecs } from '../../../../common/ecs';
import { PERMISSION_DENIED } from '../../../detection_engine/rule_response_actions/osquery/translations';
import { expandDottedObject } from '../../../../common/utils/expand_dotted';
import { RESPONSE_ACTION_TYPES } from '../../../../common/detection_engine/rule_response_actions/schemas';
import { useIsExperimentalFeatureEnabled } from '../../hooks/use_experimental_features';
import { useKibana } from '../../lib/kibana';
import { EventsViewType } from './event_details';
import * as i18n from './translations';

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

export const useOsqueryTab = ({
  rawEventData,
  ecsData,
}: {
  rawEventData?: AlertRawEventData;
  ecsData?: Ecs;
}) => {
  const {
    services: { osquery, application },
  } = useKibana();
  const responseActionsEnabled = useIsExperimentalFeatureEnabled('responseActionsEnabled');

  const emptyPrompt = useMemo(
    () => (
      <EuiEmptyPrompt
        iconType="logoOsquery"
        title={<h2>{PERMISSION_DENIED}</h2>}
        titleSize="xs"
        body={
          <FormattedMessage
            id="xpack.securitySolution.osquery.results.missingPrivilleges"
            defaultMessage="To access these results, ask your administrator for {osquery} Kibana
              privileges."
            values={{
              // eslint-disable-next-line react/jsx-no-literals
              osquery: <EuiCode>osquery</EuiCode>,
            }}
          />
        }
      />
    ),
    []
  );

  if (!osquery || !rawEventData || !responseActionsEnabled || !ecsData) {
    return;
  }

  const { OsqueryResults } = osquery;
  const expandedEventFieldsObject = expandDottedObject(
    rawEventData.fields
  ) as ExpandedEventFieldsObject;

  const parameters = expandedEventFieldsObject.kibana?.alert?.rule?.parameters;
  const responseActions = parameters?.[0].response_actions;

  const osqueryActionsLength = responseActions?.filter(
    (action: { action_type_id: string }) => action.action_type_id === RESPONSE_ACTION_TYPES.OSQUERY
  )?.length;

  if (!osqueryActionsLength) {
    return;
  }
  const ruleName = expandedEventFieldsObject.kibana?.alert?.rule?.name;
  const agentIds = expandedEventFieldsObject.agent?.id;

  const alertId = rawEventData._id;

  return {
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
          {!application?.capabilities?.osquery?.read ? (
            emptyPrompt
          ) : (
            <OsqueryResults
              agentIds={agentIds}
              ruleName={ruleName}
              alertId={alertId}
              ecsData={ecsData}
            />
          )}
        </TabContentWrapper>
      </>
    ),
  };
};
