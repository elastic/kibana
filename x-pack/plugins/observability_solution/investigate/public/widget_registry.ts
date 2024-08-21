/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { RegisterWidget, WidgetDefinition } from './types';

export class WidgetRegistry {
  private readonly definitions: WidgetDefinition[] = [];

  constructor() {}

  registerWidget: RegisterWidget = (definition, generateCallback, renderCallback) => {
    this.definitions.push({
      ...definition,
      generate: generateCallback as WidgetDefinition['generate'],
      render: renderCallback as WidgetDefinition['render'],
    });
  };

  getWidgetDefinitions = (): WidgetDefinition[] => {
    return this.definitions;
  };
}
