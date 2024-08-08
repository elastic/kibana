/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AuthenticatedUser } from '@kbn/core/public';
import type { DeepPartial } from 'utility-types';

export interface GlobalWidgetParameters {
  timeRange: {
    from: string;
    to: string;
  };
}

export enum InvestigateWidgetColumnSpan {
  One = 1,
  Two = 2,
  Three = 3,
  Four = 4,
}

export interface Investigation {
  id: string;
  '@timestamp': number;
  user: AuthenticatedUser;
  title: string;
  items: InvestigateWidget[];
  parameters: GlobalWidgetParameters;
}

export interface InvestigateWidget<
  TParameters extends Record<string, any> = {},
  TData extends Record<string, any> = {}
> {
  id: string;
  created: number;
  last_updated: number;
  type: string;
  user: AuthenticatedUser;
  parameters: GlobalWidgetParameters & TParameters;
  data: TData;
  title: string;
  description?: string;
  columns: InvestigateWidgetColumnSpan;
  rows: number;
}

export type InvestigateWidgetCreate<TParameters extends Record<string, any> = {}> = Pick<
  InvestigateWidget,
  'title' | 'description' | 'columns' | 'rows' | 'type'
> & {
  parameters: DeepPartial<GlobalWidgetParameters> & TParameters;
};
