/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { FC } from 'react';
import { ExplorerState } from './reducers';
import { AppStateSelectedCells } from './explorer_utils';

declare interface ExplorerProps {
  explorerState: ExplorerState;
  severity: number;
  showCharts: boolean;
  setSelectedCells: (swimlaneSelectedCells: AppStateSelectedCells) => void;
}

export const Explorer: FC<ExplorerProps>;
