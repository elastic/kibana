/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EuiThemeComputed } from '@elastic/eui';
import type { Filter } from '@kbn/es-query';
import type { DeepPartial, PickByValue } from 'utility-types';
import type { AuthenticatedUser } from '@kbn/core/public';

export interface GlobalWidgetParameters {
  timeRange: {
    from: string;
    to: string;
  };
  filters: Filter[];
}

export enum InvestigateWidgetColumnSpan {
  One = 1,
  Two = 2,
  Three = 3,
  Four = 4,
}

export interface InvestigationRevision {
  id: string;
  items: InvestigateWidget[];
  parameters: GlobalWidgetParameters;
}

export interface Investigation {
  id: string;
  '@timestamp': number;
  user: AuthenticatedUser;
  revisions: InvestigationRevision[];
  title: string;
  revision: string;
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
  locked: boolean;
}

export type InvestigateWidgetCreate<TParameters extends Record<string, any> = {}> = Pick<
  InvestigateWidget,
  'title' | 'description' | 'columns' | 'rows' | 'type' | 'locked'
> & {
  parameters: DeepPartial<GlobalWidgetParameters> & TParameters;
};

export interface WorkflowBlock {
  id: string;
  content?: string;
  description?: string;
  loading: boolean;
  onClick?: () => void;
  color?: keyof PickByValue<EuiThemeComputed<{}>['colors'], string>;
  children?: React.ReactNode;
}
