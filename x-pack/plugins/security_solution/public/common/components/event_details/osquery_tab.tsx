/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiCode, EuiEmptyPrompt, EuiNotificationBadge, EuiSpacer } from '@elastic/eui';
import React, { useMemo } from 'react';
import styled from 'styled-components';
import { FormattedMessage } from '@kbn/i18n-react';
import type { Ecs } from '../../../../common/ecs';
import { PERMISSION_DENIED } from '../../../detection_engine/rule_response_actions/osquery/translations';
import { expandDottedObject } from '../../../../common/utils/expand_dotted';
import { useIsExperimentalFeatureEnabled } from '../../hooks/use_experimental_features';
import { useKibana } from '../../lib/kibana';
import { EventsViewType } from './event_details';
import * as i18n from './translations';
import type { RESPONSE_ACTION_TYPES } from '../../../../common/detection_engine/rule_response_actions/schemas/response_actions';

const TabContentWrapper = styled.div`
  height: 100%;
  position: relative;
`;
type RuleParameters = Array<{
  response_actions: Array<{
    action_type_id: RESPONSE_ACTION_TYPES.OSQUERY;
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
            id="xpack.securitySolution.osquery.results.missingPrivileges"
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

  const expandedEventFieldsObject = expandDottedObject(
    rawEventData.fields
  ) as ExpandedEventFieldsObject;

  const responseActions =
    expandedEventFieldsObject?.kibana?.alert?.rule?.parameters?.[0].response_actions;

  if (!responseActions?.length) {
    return;
  }

  const { OsqueryResults, fetchAllLiveQueries } = osquery;

  const alertId = rawEventData._id;

  const { data: actionsData } = fetchAllLiveQueries({
    filterQuery: { term: { alert_ids: alertId } },
    activePage: 0,
    limit: 100,
    sortField: '@timestamp',
    alertId,
  });
  const actionItems = actionsData?.data.items || [];

  const ruleName = expandedEventFieldsObject.kibana?.alert?.rule?.name;
  const agentIds = expandedEventFieldsObject.agent?.id;

  return {
    id: EventsViewType.osqueryView,
    'data-test-subj': 'osqueryViewTab',
    name: i18n.OSQUERY_VIEW,
    append: (
      <EuiNotificationBadge data-test-subj="osquery-actions-notification">
        {actionItems.length}
      </EuiNotificationBadge>
    ),
    content: (
      <>
        <TabContentWrapper data-test-subj="osqueryViewWrapper">
          {!application?.capabilities?.osquery?.read ? (
            emptyPrompt
          ) : (
            <>
              <OsqueryResults
                agentIds={agentIds}
                ruleName={ruleName}
                actionItems={actionItems}
                ecsData={ecsData}
              />
              <EuiSpacer size="s" />
            </>
          )}
        </TabContentWrapper>
      </>
    ),
  };
};
