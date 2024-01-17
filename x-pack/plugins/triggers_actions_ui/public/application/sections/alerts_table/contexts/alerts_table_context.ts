/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createContext } from 'react';
import { noop } from 'lodash';
import { QueryClient } from '@tanstack/react-query';
import { AlertsTableContextType } from '../types';

export const AlertsTableQueryContext = createContext<QueryClient | undefined>(undefined);

export const AlertsTableContext = createContext<AlertsTableContextType>({
  mutedAlerts: {},
  bulkActions: [{}, noop] as unknown as AlertsTableContextType['bulkActions'],
});
