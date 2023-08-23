/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { DiscoverStateContainer } from '@kbn/discover-plugin/public';
import { createContext } from 'react';

interface DiscoverInTimelineContextType {
  discoverStateContainer: DiscoverStateContainer | undefined;
  setDiscoverStateContainer: (stateContainer: DiscoverStateContainer) => void;
}

export const DiscoverInTimelineContext = createContext<DiscoverInTimelineContextType | null>(null);
