/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import styled from 'styled-components';
import { EuiSpacer } from '@elastic/eui';
import type { Ecs } from '@kbn/cases-plugin/common';
import type { SearchHit } from '../../../../common/search_strategy';
import { ResponseActionsResults } from '../../../common/components/response_actions/response_actions_results';
import type {
  ExpandedEventFieldsObject,
  RawEventData,
} from '../../../../common/types/response_actions';
import { useIsExperimentalFeatureEnabled } from '../../../common/hooks/use_experimental_features';
import { expandDottedObject } from '../../../../common/utils/expand_dotted';
import { useGetAutomatedActionList } from '../../../management/hooks/response_actions/use_get_automated_action_list';

const TabContentWrapper = styled.div`
  height: 100%;
  position: relative;
`;

export const useResponseActionsTab = ({
  rawEventData,
  ecsData,
}: {
  rawEventData: SearchHit | undefined;
  ecsData: Ecs | null;
}) => {
  const responseActionsEnabled = useIsExperimentalFeatureEnabled('endpointResponseActionsEnabled');
  const shouldEarlyReturn = !responseActionsEnabled || !rawEventData;
  const alertId = rawEventData?._id ?? '';

  const { data: automatedList, isFetched } = useGetAutomatedActionList(
    {
      alertIds: [alertId],
    },
    { enabled: !shouldEarlyReturn }
  );

  if (shouldEarlyReturn) {
    return;
  }

  const expandedEventFieldsObject = expandDottedObject(
    (rawEventData as RawEventData).fields
  ) as ExpandedEventFieldsObject;

  const ruleName = expandedEventFieldsObject?.kibana?.alert?.rule?.name;
  const totalItemCount = automatedList?.items?.length ?? 0;
  const responseActions =
    expandedEventFieldsObject.kibana?.alert?.rule?.parameters?.[0].response_actions;

  if (!responseActions?.length) {
    return;
  }

  return (
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
  );
};
