/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiSpacer, EuiTitle } from '@elastic/eui';
import styled from 'styled-components';
import { RESPONSES_DETAILS_TEST_ID, RESPONSES_EMPTY_TEST_ID } from './test_ids';
import { expandDottedObject } from '../../../../common/utils/expand_dotted';
import type {
  ExpandedEventFieldsObject,
  RawEventData,
} from '../../../../common/types/response_actions';
import { useLeftPanelContext } from '../context';
import { useIsExperimentalFeatureEnabled } from '../../../common/hooks/use_experimental_features';
import { useOsqueryTab } from '../../../common/components/event_details/osquery_tab';
import { useResponseActionsView } from '../../../common/components/event_details/response_actions_view';
import * as i18n from './translations';

export const RESPONSES_TAB_ID = 'responses-details';

const InlineBlock = styled.div`
  display: inline-block;
  line-height: 1.7em;
`;

export const ResponsesDetails: React.FC = () => {
  const { data, ecs } = useLeftPanelContext();
  const endpointResponseActionsEnabled = useIsExperimentalFeatureEnabled(
    'endpointResponseActionsEnabled'
  );
  const expandedEventFieldsObject = expandDottedObject(
    (data as RawEventData).fields
  ) as ExpandedEventFieldsObject;

  const responseActions =
    expandedEventFieldsObject?.kibana?.alert?.rule?.parameters?.[0].response_actions;

  const responseActionsTab = useResponseActionsView({
    rawEventData: data,
    ecsData: ecs,
    isTab: false,
  });
  const osqueryTab = useOsqueryTab({
    rawEventData: data,
    ecsData: ecs,
    isTab: false,
  });

  return (
    <div data-test-subj={RESPONSES_DETAILS_TEST_ID}>
      <EuiTitle size="xxxs">
        <h5>{i18n.RESPONSE_TITLE}</h5>
      </EuiTitle>
      <EuiSpacer size="s" />
      {!responseActions ? (
        <InlineBlock data-test-subj={RESPONSES_EMPTY_TEST_ID}>{i18n.RESPONSE_EMPTY}</InlineBlock>
      ) : (
        <>{endpointResponseActionsEnabled ? responseActionsTab : osqueryTab}</>
      )}
    </div>
  );
};

ResponsesDetails.displayName = 'ResponsesDetails';
