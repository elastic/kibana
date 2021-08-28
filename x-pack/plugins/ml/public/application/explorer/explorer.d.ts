/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { FC } from 'react';
import type { AppStateSelectedCells } from './explorer_utils';
import type { ExplorerState } from './reducers/explorer_reducer/state';

declare interface ExplorerProps {
  explorerState: ExplorerState;
  severity: number;
  showCharts: boolean;
  setSelectedCells: (swimlaneSelectedCells: AppStateSelectedCells) => void;
}

export const Explorer: FC<ExplorerProps>;
