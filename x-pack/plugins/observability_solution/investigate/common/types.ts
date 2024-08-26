/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { DeepPartial } from 'utility-types';

export interface GlobalWidgetParameters {
  timeRange: {
    from: string;
    to: string;
  };
}

export interface Investigation {
  id: string;
  createdAt: number;
  title: string;
  items: InvestigateWidget[];
  notes: InvestigationNote[];
  parameters: GlobalWidgetParameters;
}

export interface InvestigationNote {
  id: string;
  createdAt: number;
  createdBy: string;
  content: string;
}

export interface InvestigateWidget<
  TParameters extends Record<string, any> = {},
  TData extends Record<string, any> = {}
> {
  id: string;
  createdAt: number;
  createdBy: string;
  title: string;
  type: string;
  parameters: GlobalWidgetParameters & TParameters;
  data: TData;
}

export type InvestigateWidgetCreate<TParameters extends Record<string, any> = {}> = Pick<
  InvestigateWidget,
  'title' | 'type'
> & {
  parameters: DeepPartial<GlobalWidgetParameters> & TParameters;
};
