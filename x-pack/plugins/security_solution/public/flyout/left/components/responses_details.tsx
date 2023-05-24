/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { useIsExperimentalFeatureEnabled } from '../../../common/hooks/use_experimental_features';
import { useLeftPanelContext } from '../context';
import { useOsqueryTab } from './use_osquery_tab';
import { useResponseActionsTab } from './use_response_actions_tab';

export const RESPONSES_TAB_ID = 'responses-details';

/**
 * Threat intelligence displayed in the document details expandable flyout left section under the Insights tab
 */
export const ResponsesDetails: React.FC = () => {
  const { data, ecs } = useLeftPanelContext();
  const endpointResponseActionsEnabled = useIsExperimentalFeatureEnabled(
    'endpointResponseActionsEnabled'
  );

  const responseActionsTab = useResponseActionsTab({ rawEventData: data, ecsData: ecs });
  const osqueryTab = useOsqueryTab({
    rawEventData: data,
    ecsData: ecs,
  });
  return <div>{endpointResponseActionsEnabled ? responseActionsTab : osqueryTab}</div>;
};

ResponsesDetails.displayName = 'ResponsesDetails';
