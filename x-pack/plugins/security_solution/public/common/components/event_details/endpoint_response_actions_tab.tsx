/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo } from 'react';
import styled from 'styled-components';
import { EuiNotificationBadge, EuiSpacer } from '@elastic/eui';
import { ActionsLogTable } from '../../../management/components/endpoint_response_actions_list/components/actions_log_table';
import { useGetEndpointActionList } from '../../../management/hooks';
import type { ExpandedEventFieldsObject, RawEventData } from './types';
import { EventsViewType } from './event_details';
import * as i18n from './translations';

import { expandDottedObject } from '../../../../common/utils/expand_dotted';
import { useIsExperimentalFeatureEnabled } from '../../hooks/use_experimental_features';
import { RESPONSE_ACTION_TYPES } from '../../../../common/detection_engine/rule_response_actions/schemas/response_actions';

const TabContentWrapper = styled.div`
  height: 100%;
  position: relative;
`;

export const useEndpointResponseActionsTab = ({
  rawEventData,
}: {
  rawEventData?: RawEventData;
}) => {
  const responseActionsEnabled = useIsExperimentalFeatureEnabled('endpointResponseActionsEnabled');

  const {
    data: actionList,
    isFetching,
    isFetched,
  } = useGetEndpointActionList(
    {
      alertIds: [rawEventData?._id ?? ''],
      withRuleActions: true,
    },
    { retry: false, enabled: rawEventData && responseActionsEnabled }
  );

  const totalItemCount = useMemo(() => actionList?.total ?? 0, [actionList]);

  if (!rawEventData || !responseActionsEnabled) {
    return;
  }

  const expandedEventFieldsObject = expandDottedObject(
    rawEventData.fields
  ) as ExpandedEventFieldsObject;

  const responseActions =
    expandedEventFieldsObject?.kibana?.alert?.rule?.parameters?.[0].response_actions;

  const endpointResponseActions = responseActions?.filter(
    (responseAction) => responseAction.action_type_id === RESPONSE_ACTION_TYPES.ENDPOINT
  );
  if (!endpointResponseActions?.length) {
    return;
  }

  return {
    id: EventsViewType.endpointView,
    'data-test-subj': 'endpointViewTab',
    name: i18n.ENDPOINT_VIEW,
    append: (
      <EuiNotificationBadge data-test-subj="endpoint-actions-notification">
        {totalItemCount}
      </EuiNotificationBadge>
    ),
    content: (
      <>
        <EuiSpacer size="s" />
        <TabContentWrapper data-test-subj="endpointViewWrapper">
          {isFetched && totalItemCount ? (
            <ActionsLogTable
              data-test-subj="endpoint-actions-results-table"
              isFlyout={false}
              onShowActionDetails={() => null}
              items={actionList?.data || []}
              loading={isFetching}
              onChange={() => null}
              totalItemCount={totalItemCount}
              queryParams={{ withRuleActions: true }}
              showHostNames
            />
          ) : null}
        </TabContentWrapper>
      </>
    ),
  };
};
