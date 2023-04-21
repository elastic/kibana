/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FC } from 'react';
import React, { memo } from 'react';
import { useResponseActionsTab } from '../components/use_response_actions_tab';
import { useLeftPanelContext } from '../context';

/**
 * Investigations view displayed in the document details expandable flyout left section
 */
export const ResponseActionsTab: FC = memo(() => {
  const { rawEventData } = useLeftPanelContext();

  const responseActionsTab = useResponseActionsTab(rawEventData);

  return <div>{responseActionsTab}</div>;
});

ResponseActionsTab.displayName = 'ResponseActionsTab';
