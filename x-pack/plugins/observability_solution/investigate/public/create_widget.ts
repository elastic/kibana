/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { DeepPartial } from 'utility-types';
import { InvestigateWidgetCreate } from '../common';
import { GlobalWidgetParameters } from '../common/types';

type MakePartial<T extends Record<string, any>, K extends keyof T> = Omit<T, K> &
  DeepPartial<Pick<T, K>>;

type PredefinedKeys = 'type';

export type WidgetFactory<TParameters extends Record<string, any>> = <
  T extends MakePartial<InvestigateWidgetCreate<TParameters>, PredefinedKeys>
>(
  widgetCreate: T
) => Pick<InvestigateWidgetCreate<TParameters>, PredefinedKeys> &
  Omit<T, 'parameters'> & { parameters: T['parameters'] & DeepPartial<GlobalWidgetParameters> };

export function createWidgetFactory<TParameters extends Record<string, any>>(
  type: string
): WidgetFactory<TParameters> {
  const createWidget: WidgetFactory<TParameters> = (widgetCreate) => {
    return {
      type,
      ...widgetCreate,
    };
  };

  return createWidget;
}
