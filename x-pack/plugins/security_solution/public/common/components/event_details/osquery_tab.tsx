/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiNotificationBadge, EuiSpacer } from '@elastic/eui';
import React from 'react';
import styled from 'styled-components';
import type { Ecs } from '@kbn/cases-plugin/common';
import type { SearchHit } from '../../../../common/search_strategy';
import type {
  ExpandedEventFieldsObject,
  RawEventData,
} from '../../../../common/types/response_actions';
import { expandDottedObject } from '../../../../common/utils/expand_dotted';
import { useIsExperimentalFeatureEnabled } from '../../hooks/use_experimental_features';
import { useKibana } from '../../lib/kibana';
import { EventsViewType } from './event_details';
import * as i18n from './translations';
import { RESPONSE_ACTION_TYPES } from '../../../../common/detection_engine/rule_response_actions/schemas/response_actions';

const TabContentWrapper = styled.div`
  height: 100%;
  position: relative;
`;

export const useOsqueryTab = ({
  rawEventData,
  ecsData,
  isNewFlyout,
}: {
  rawEventData?: SearchHit | undefined;
  ecsData?: Ecs | null;
  isNewFlyout: boolean;
}) => {
  const {
    services: { osquery },
  } = useKibana();
  const responseActionsEnabled = useIsExperimentalFeatureEnabled('responseActionsEnabled');
  const endpointResponseActionsEnabled = useIsExperimentalFeatureEnabled(
    'endpointResponseActionsEnabled'
  );

  const expandedEventFieldsObject = rawEventData
    ? (expandDottedObject((rawEventData as RawEventData).fields) as ExpandedEventFieldsObject)
    : undefined;

  const responseActions =
    expandedEventFieldsObject?.kibana?.alert?.rule?.parameters?.[0].response_actions;

  const shouldEarlyReturn =
    !rawEventData ||
    !responseActionsEnabled ||
    endpointResponseActionsEnabled ||
    !ecsData ||
    !responseActions?.length;

  const alertId = rawEventData?._id ?? '';

  const { OsqueryResults, fetchAllLiveQueries } = osquery;

  const { data: actionsData } = fetchAllLiveQueries({
    filterQuery: { term: { alert_ids: alertId } },
    alertId,
    skip: shouldEarlyReturn,
  });

  if (shouldEarlyReturn) {
    return;
  }

  const osqueryResponseActions = responseActions.filter(
    (responseAction) => responseAction.action_type_id === RESPONSE_ACTION_TYPES.OSQUERY
  );

  if (!osqueryResponseActions?.length) {
    return;
  }

  const actionItems = actionsData?.data.items || [];

  const ruleName = expandedEventFieldsObject?.kibana?.alert?.rule?.name;

  const content = (
    <TabContentWrapper data-test-subj="osqueryViewWrapper">
      <OsqueryResults ruleName={ruleName} actionItems={actionItems} ecsData={ecsData} />
      <EuiSpacer size="s" />
    </TabContentWrapper>
  );

  if (!isNewFlyout) {
    return {
      id: EventsViewType.osqueryView,
      'data-test-subj': 'osqueryViewTab',
      name: i18n.OSQUERY_VIEW,
      append: (
        <EuiNotificationBadge data-test-subj="osquery-actions-notification">
          {actionItems.length}
        </EuiNotificationBadge>
      ),
      content,
    };
  }
  return content;
};
