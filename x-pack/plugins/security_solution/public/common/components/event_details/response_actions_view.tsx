/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo, useState, useEffect } from 'react';
import styled from 'styled-components';
import type { EuiTabbedContentTab } from '@elastic/eui';
import { EuiLink, EuiNotificationBadge, EuiSpacer } from '@elastic/eui';
import type { Ecs } from '@kbn/cases-plugin/common';
import { FormattedMessage } from '@kbn/i18n-react';
import type { LogsOsqueryAction } from '@kbn/osquery-plugin/common/types/osquery_action';
import type { UseQueryResult } from '@tanstack/react-query';
import { useQuery } from '@tanstack/react-query';
import { lastValueFrom } from 'rxjs';
import { compact, filter, map } from 'lodash';
import type { EndpointAutomatedActionListRequestQuery } from '../../../../common/endpoint/schema/automated_actions';
import type { ActionDetails, LogsEndpointActionWithHosts } from '../../../../common/endpoint/types';
import { useGetEndpointActionList } from '../../../management/hooks';
import { RESPONSE_NO_DATA_TEST_ID } from '../../../flyout/document_details/left/components/test_ids';
import type { SearchHit } from '../../../../common/search_strategy';
import type {
  ExpandedEventFieldsObject,
  RawEventData,
} from '../../../../common/types/response_actions';
import { ResponseActionsResults } from '../response_actions/response_actions_results';
import { expandDottedObject } from '../../../../common/utils/expand_dotted';
import { EventsViewType } from './event_details';
import * as i18n from './translations';

import { useIsExperimentalFeatureEnabled } from '../../hooks/use_experimental_features';
import { DEFAULT_POLL_INTERVAL } from '../../../management/common/constants';
import type {
  ActionRequestOptions,
  ActionRequestStrategyResponse,
} from '../../../../common/search_strategy/endpoint/response_actions';
import { ResponseActionsQueries } from '../../../../common/search_strategy/endpoint/response_actions';
import { useKibana } from '../../lib/kibana';
import type { ResponseActionsSearchHit } from '../../../../common/search_strategy/endpoint/response_actions/types';
import { SortOrder } from '../../../../common/search_strategy/endpoint/response_actions/types';
import { ENDPOINT_SEARCH_STRATEGY } from '../../../../common/endpoint/constants';

const TabContentWrapper = styled.div`
  height: 100%;
  position: relative;
`;
const InlineBlock = styled.div`
  display: inline-block;
  line-height: 1.7em;
`;

const EmptyResponseActions = () => {
  return (
    <InlineBlock data-test-subj={RESPONSE_NO_DATA_TEST_ID}>
      <FormattedMessage
        id="xpack.securitySolution.flyout.left.response.noDataDescription"
        defaultMessage="There are no response actions defined for this event. To add some, edit the rule's settings and set up {link}."
        values={{
          link: (
            <EuiLink
              href="https://www.elastic.co/guide/en/security/current/rules-ui-create.html#rule-response-action"
              target="_blank"
            >
              <FormattedMessage
                id="xpack.securitySolution.flyout.left.response.noDataLinkText"
                defaultMessage="response actions"
              />
            </EuiLink>
          ),
        }}
      />
    </InlineBlock>
  );
};

export const useResponseActionsView = <T extends object = JSX.Element>({
  rawEventData,
  ecsData,
}: {
  ecsData?: Ecs | null;
  rawEventData: SearchHit | undefined;
}): EuiTabbedContentTab | undefined => {
  // can not be moved outside of the component, because then EventsViewType throws runtime error regarding not being initialized yet
  const viewData = useMemo(
    () => ({
      id: EventsViewType.responseActionsView,
      'data-test-subj': 'responseActionsViewTab',
      name: i18n.RESPONSE_ACTIONS_VIEW,
    }),
    []
  );
  const responseActionsEnabled = useIsExperimentalFeatureEnabled('endpointResponseActionsEnabled');
  const expandedEventFieldsObject = rawEventData
    ? (expandDottedObject((rawEventData as RawEventData).fields) as ExpandedEventFieldsObject)
    : undefined;

  const responseActions =
    expandedEventFieldsObject?.kibana?.alert?.rule?.parameters?.[0].response_actions;
  const alertId = rawEventData?._id ?? '';
  const shouldEarlyReturn = !rawEventData || !responseActionsEnabled || !alertId;

  const [isLive, setIsLive] = useState(false);

  const { data: alertResponseActions, isFetched } = useGetEndpointActionList(
    { alertIds: [alertId] },
    { enabled: !shouldEarlyReturn, refetchInterval: isLive ? DEFAULT_POLL_INTERVAL : false }
  );

  const { data: automatedList } = useFetchOsQueryAutomatedActions(
    {
      alertIds: [alertId],
    },
    { enabled: !shouldEarlyReturn, isLive }
  );

  const actionList: Array<ActionDetails | LogsOsqueryAction> = useMemo(() => {
    return [...(alertResponseActions?.data ?? []), ...(automatedList?.items ?? [])];
  }, [alertResponseActions?.data, automatedList?.items]);

  useEffect(() => {
    setIsLive(() => !(!responseActions?.length || !!automatedList?.items?.length));
  }, [automatedList, responseActions?.length]);

  if (shouldEarlyReturn) {
    return {
      ...viewData,
      content: <EmptyResponseActions />,
    };
  } else {
    const ruleName = expandedEventFieldsObject?.kibana?.alert?.rule?.name?.[0];

    const automatedListItems = automatedList?.items ?? [];
    return {
      ...viewData,
      append: (
        <EuiNotificationBadge data-test-subj="response-actions-notification">
          {automatedListItems.length}
        </EuiNotificationBadge>
      ),
      content: (
        <>
          <EuiSpacer size="s" />
          <TabContentWrapper data-test-subj="responseActionsViewWrapper">
            {isFetched && !!automatedListItems.length ? (
              <ResponseActionsResults actions={actionList} ruleName={ruleName} ecsData={ecsData} />
            ) : (
              <EmptyResponseActions />
            )}
          </TabContentWrapper>
        </>
      ),
    };
  }
};

interface UseFetchOsQueryAutomatedActionsProps {
  enabled: boolean;
  isLive: boolean;
}

// Make sure we keep this and ACTIONS_QUERY_KEY in osquery_flyout.tsx in sync.
const ACTIONS_QUERY_KEY = 'actions';

const useFetchOsQueryAutomatedActions = (
  query: EndpointAutomatedActionListRequestQuery,
  { enabled, isLive }: UseFetchOsQueryAutomatedActionsProps
): UseQueryResult<ActionRequestStrategyResponse & { items: LogsEndpointActionWithHosts[] }> => {
  const { data } = useKibana().services;
  const { alertIds } = query;
  return useQuery({
    queryKey: [ACTIONS_QUERY_KEY, { alertId: alertIds[0] }],
    queryFn: async () => {
      const responseData = await lastValueFrom(
        data.search.search<ActionRequestOptions, ActionRequestStrategyResponse>(
          {
            alertIds,
            sort: {
              order: SortOrder.desc,
              field: '@timestamp',
            },
            factoryQueryType: ResponseActionsQueries.actions,
          },
          {
            strategy: ENDPOINT_SEARCH_STRATEGY,
          }
        )
      );

      // fields have to firstly be expanded from dotted object to kind of normal nested object
      const items = map(
        filter(responseData.edges, 'fields'),
        (
          edge: ResponseActionsSearchHit & {
            fields: object;
          }
        ) => {
          return expandDottedObject(edge.fields, true);
        }
      );

      return {
        ...responseData,
        items: compact(items),
      };
    },
    enabled,
    refetchInterval: isLive ? 5000 : false,
    keepPreviousData: true,
  });
};
