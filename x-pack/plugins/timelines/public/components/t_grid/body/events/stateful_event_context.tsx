/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { TimelineTabs } from '../../../../../common/types/timeline';

interface StatefulEventContext {
  tabType: TimelineTabs | undefined;
  timelineID: string;
}

// This context is available to all children of the stateful_event component where the provider is currently set
export const StatefulEventContext = React.createContext<StatefulEventContext | null>(null);
