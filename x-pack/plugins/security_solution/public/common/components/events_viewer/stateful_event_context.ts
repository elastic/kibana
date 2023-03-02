/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createContext } from 'react';
export interface StatefulEventContextType {
  tabType: string | undefined;
  timelineID: string;
  enableHostDetailsFlyout: boolean;
  enableIpDetailsFlyout: boolean;
  onRuleChange?: () => void;
}

export const StatefulEventContext = createContext<StatefulEventContextType | null>(null);
