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
import { RESPONSE_NO_DATA_TEST_ID } from '../../../flyout/document_details/left/components/test_ids';
import type { SearchHit } from '../../../../common/search_strategy';
import type {
  ExpandedEventFieldsObject,
  RawEventData,
} from '../../../../common/types/response_actions';
import { ResponseActionsResults } from '../response_actions/response_actions_results';
import { expandDottedObject } from '../../../../common/utils/expand_dotted';
import { useGetAutomatedActionList } from '../../../management/hooks/response_actions/use_get_automated_action_list';
import { EventsViewType } from './event_details';
import * as i18n from './translations';

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

// TODO: MOVE TO FLYOUT FOLDER - https://github.com/elastic/security-team/issues/7462
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
  const expandedEventFieldsObject = rawEventData
    ? (expandDottedObject((rawEventData as RawEventData).fields) as ExpandedEventFieldsObject)
    : undefined;

  const responseActions =
    expandedEventFieldsObject?.kibana?.alert?.rule?.parameters?.[0].response_actions;
  const shouldEarlyReturn = !rawEventData;

  const alertId = rawEventData?._id ?? '';
  const [isLive, setIsLive] = useState(false);

  const { data: automatedList, isFetched } = useGetAutomatedActionList(
    {
      alertIds: [alertId],
    },
    { enabled: !shouldEarlyReturn, isLive }
  );

  // calculating whether or not our useGetAutomatedActionList (react-query) should try to refetch data
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
              <ResponseActionsResults
                actions={automatedListItems}
                ruleName={ruleName}
                ecsData={ecsData}
              />
            ) : (
              <EmptyResponseActions />
            )}
          </TabContentWrapper>
        </>
      ),
    };
  }
};
