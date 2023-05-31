/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo } from 'react';
import styled from 'styled-components';
import { EuiNotificationBadge, EuiSpacer } from '@elastic/eui';
import type { EcsSecurityExtension as Ecs } from '@kbn/securitysolution-ecs';
import { useUserPrivileges } from '../user_privileges';
import { ResponseActionsResults } from '../response_actions/response_actions_results';
import { expandDottedObject } from '../../../../common/utils/expand_dotted';
import { useGetAutomatedActionList } from '../../../management/hooks/response_actions/use_get_automated_action_list';
import { EventsViewType } from './event_details';
import * as i18n from './translations';

import { useIsExperimentalFeatureEnabled } from '../../hooks/use_experimental_features';
import type { ExpandedEventFieldsObject, RawEventData } from './types';

const TabContentWrapper = styled.div`
  height: 100%;
  position: relative;
`;

export const useResponseActionsView = ({
  rawEventData,
  ecsData,
}: {
  ecsData?: Ecs;
  rawEventData: RawEventData;
}) => {
  const responseActionsEnabled = useIsExperimentalFeatureEnabled('endpointResponseActionsEnabled');
  const {
    endpointPrivileges: { canAccessEndpointActionsLogManagement },
  } = useUserPrivileges();
  const expandedEventFieldsObject = rawEventData
    ? (expandDottedObject(rawEventData.fields) as ExpandedEventFieldsObject)
    : undefined;

  const responseActions =
    expandedEventFieldsObject?.kibana?.alert?.rule?.parameters?.[0].response_actions;

  const shouldEarlyReturn = !ecsData || !responseActionsEnabled || !responseActions;
  const alertId = rawEventData?._id ?? '';

  const { data: automatedList, isFetched } = useGetAutomatedActionList(
    {
      alertIds: [alertId],
    },
    { enabled: !shouldEarlyReturn, canAccessEndpointActionsLogManagement }
  );

  const ruleName = expandedEventFieldsObject?.kibana?.alert?.rule?.name;

  const totalItemCount = useMemo(() => automatedList?.items?.length ?? 0, [automatedList]);

  if (shouldEarlyReturn || !responseActions?.length) {
    return;
  }

  return {
    id: EventsViewType.responseActionsView,
    'data-test-subj': 'responseActionsViewTab',
    name: i18n.RESPONSE_ACTIONS_VIEW,
    append: (
      <EuiNotificationBadge data-test-subj="response-actions-notification">
        {totalItemCount}
      </EuiNotificationBadge>
    ),
    content: (
      <>
        <EuiSpacer size="s" />
        <TabContentWrapper data-test-subj="responseActionsViewWrapper">
          {isFetched && totalItemCount && automatedList?.items.length ? (
            <ResponseActionsResults
              actions={automatedList.items}
              ruleName={ruleName}
              ecsData={ecsData}
            />
          ) : null}
        </TabContentWrapper>
      </>
    ),
  };
};
