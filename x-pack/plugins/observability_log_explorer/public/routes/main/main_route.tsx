/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ScopedHistory } from '@kbn/core/public';
import { LogExplorerPluginStart } from '@kbn/log-explorer-plugin/public';
import React from 'react';

export interface ObservablityLogExplorerMainRouteProps {
  history: ScopedHistory;
  logExplorer: LogExplorerPluginStart;
}

export const ObservablityLogExplorerMainRoute = ({
  history,
  logExplorer,
}: ObservablityLogExplorerMainRouteProps) => <logExplorer.LogExplorer scopedHistory={history} />;
