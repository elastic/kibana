/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { DeepPartial } from 'utility-types';
import { InvestigateWidgetColumnSpan, InvestigateWidgetCreate } from '../common';
import { GlobalWidgetParameters } from '../common/types';

type MakePartial<T extends Record<string, any>, K extends keyof T> = Omit<T, K> &
  DeepPartial<Pick<T, K>>;

type PredefinedKeys = 'rows' | 'columns' | 'type';

type AllowedDefaultKeys = 'rows' | 'columns';

export type WidgetFactory<TParameters extends Record<string, any>> = <
  T extends MakePartial<InvestigateWidgetCreate<TParameters>, PredefinedKeys>
>(
  widgetCreate: T
) => Pick<InvestigateWidgetCreate<TParameters>, PredefinedKeys> &
  Omit<T, 'parameters'> & { parameters: T['parameters'] & DeepPartial<GlobalWidgetParameters> };

export function createWidgetFactory<TParameters extends Record<string, any>>(
  type: string,
  defaults?: Pick<Partial<InvestigateWidgetCreate>, AllowedDefaultKeys>
): WidgetFactory<TParameters> {
  const createWidget: WidgetFactory<TParameters> = (widgetCreate) => {
    return {
      rows: 12,
      columns: InvestigateWidgetColumnSpan.Four,
      type,
      ...defaults,
      ...widgetCreate,
    };
  };

  return createWidget;
}
