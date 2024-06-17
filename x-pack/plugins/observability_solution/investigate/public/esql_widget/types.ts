/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { IconType } from '@elastic/eui';
import type { Ast } from '@kbn/interpreter';
import type { InvestigateWidgetCreate } from '../../common';
import type { GlobalWidgetParameters } from '../../common/types';

// copied over from the Lens plugin to prevent dependency hell
type TableChangeType = 'initial' | 'unchanged' | 'reduced' | 'extended' | 'reorder' | 'layers';

interface Suggestion<T = unknown, V = unknown> {
  visualizationId: string;
  datasourceState?: V;
  datasourceId?: string;
  columns: number;
  score: number;
  title: string;
  visualizationState: T;
  previewExpression?: Ast | string;
  previewIcon: IconType;
  hide?: boolean;
  // flag to indicate if the visualization is incomplete
  incomplete?: boolean;
  changeType: TableChangeType;
  keptLayerIds: string[];
}

export interface EsqlWidgetParameters {
  esql: string;
  suggestion?: Suggestion;
  predefined?: Partial<GlobalWidgetParameters>;
}

export type EsqlWidgetCreate = InvestigateWidgetCreate<EsqlWidgetParameters>;
