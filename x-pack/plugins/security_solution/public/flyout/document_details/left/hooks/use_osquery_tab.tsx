/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EuiTabbedContentTab } from '@elastic/eui';
import { EuiNotificationBadge, EuiSpacer } from '@elastic/eui';
import React from 'react';
import styled from 'styled-components';
import type { Ecs } from '@kbn/cases-plugin/common';
import { i18n } from '@kbn/i18n';
import { ResponseActionTypesEnum } from '../../../../../common/api/detection_engine';
import type { SearchHit } from '../../../../../common/search_strategy';
import type {
  ExpandedEventFieldsObject,
  RawEventData,
} from '../../../../../common/types/response_actions';
import { expandDottedObject } from '../../../../../common/utils/expand_dotted';
import { useIsExperimentalFeatureEnabled } from '../../../../common/hooks/use_experimental_features';
import { useKibana } from '../../../../common/lib/kibana';

const OSQUERY_VIEW = i18n.translate('xpack.securitySolution.flyout.osqueryView', {
  defaultMessage: 'Osquery Results',
});

const TabContentWrapper = styled.div`
  height: 100%;
  position: relative;
`;

const viewData = {
  id: 'osquery-results-view',
  name: OSQUERY_VIEW,
};

export interface UseOsqueryTabParams {
  /**
   *
   */
  ecsData?: Ecs | null;
  /**
   *
   */
  rawEventData: SearchHit | undefined;
}

/**
 *
 */
export const useOsqueryTab = ({
  rawEventData,
  ecsData,
}: UseOsqueryTabParams): EuiTabbedContentTab | undefined => {
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
    kuery: `alert_ids: ( ${alertId} )`,
    alertId,
    skip: shouldEarlyReturn,
  });

  if (shouldEarlyReturn) {
    return;
  }

  const osqueryResponseActions = responseActions.filter(
    (responseAction) => responseAction.action_type_id === ResponseActionTypesEnum['.osquery']
  );
  if (!osqueryResponseActions?.length) {
    return;
  }

  const actionItems = actionsData?.data.items || [];
  const ruleName = expandedEventFieldsObject?.kibana?.alert?.rule?.name?.[0];

  return {
    ...viewData,
    append: (
      <EuiNotificationBadge data-test-subj="osquery-actions-notification">
        {actionItems.length}
      </EuiNotificationBadge>
    ),
    content: (
      <TabContentWrapper data-test-subj="osqueryViewWrapper">
        <OsqueryResults ruleName={ruleName} actionItems={actionItems} ecsData={ecsData} />
        <EuiSpacer size="s" />
      </TabContentWrapper>
    ),
  };
};
