/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect, useMemo, useState } from 'react';
import styled from 'styled-components';
import { EuiNotificationBadge, EuiSpacer } from '@elastic/eui';
import { some } from 'lodash';
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
  const [isLive, setIsLive] = useState(false);

  const {
    data: actionList,
    isFetching,
    isFetched,
  } = useGetEndpointActionList(
    {
      alertId: [rawEventData?._id ?? ''],
      withAutomatedActions: true,
    },
    {
      retry: false,
      enabled: rawEventData && responseActionsEnabled,
      refetchInterval: isLive ? 5000 : false,
    }
  );

  useEffect(
    () =>
      setIsLive(() =>
        some(actionList?.data, (action) => !action.errors?.length && action.status === 'pending')
      ),
    [actionList?.data]
  );

  const totalItemCount = useMemo(() => actionList?.total ?? 0, [actionList]);

  const expandedEventFieldsObject = rawEventData
    ? (expandDottedObject(rawEventData.fields) as ExpandedEventFieldsObject)
    : undefined;

  const responseActions = useMemo(
    () => expandedEventFieldsObject?.kibana?.alert?.rule?.parameters?.[0].response_actions,
    [expandedEventFieldsObject]
  );

  const endpointResponseActions = useMemo(
    () =>
      responseActions?.filter(
        (responseAction) => responseAction.action_type_id === RESPONSE_ACTION_TYPES.ENDPOINT
      ),
    [responseActions]
  );

  if (!endpointResponseActions?.length || !rawEventData || !responseActionsEnabled) {
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
              queryParams={{ withAutomatedActions: true }}
              showHostNames
            />
          ) : null}
        </TabContentWrapper>
      </>
    ),
  };
};
