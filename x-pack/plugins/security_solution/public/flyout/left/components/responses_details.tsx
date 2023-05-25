/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { useLeftPanelContext } from '../context';
import { useIsExperimentalFeatureEnabled } from '../../../common/hooks/use_experimental_features';
import { useOsqueryTab } from '../../../common/components/event_details/osquery_tab';
import { useResponseActionsView } from '../../../common/components/event_details/response_actions_view';

export const RESPONSES_TAB_ID = 'responses-details';

export const ResponsesDetails: React.FC = () => {
  const { data, ecs } = useLeftPanelContext();
  const endpointResponseActionsEnabled = useIsExperimentalFeatureEnabled(
    'endpointResponseActionsEnabled'
  );

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
  return <div>{endpointResponseActionsEnabled ? responseActionsTab : osqueryTab}</div>;
};

ResponsesDetails.displayName = 'ResponsesDetails';
