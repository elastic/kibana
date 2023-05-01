/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ComponentType } from 'react';

type RegistryComponent = ComponentType<Record<string, any> | undefined>;

export class ExportTypesRegistry {
  static readonly defaultRegistry: Record<string, RegistryComponent>;
  registry: { [key in string]?: RegistryComponent } = {};

  setup = {
    register: (id: string, component: RegistryComponent) => {
      this.registry[id] = component;
    },
  };
  start = {
    /**  @link advanced_settings/public/component_registry */
    get: (id: string): RegistryComponent => {
      return this.registry[id] || ExportTypesRegistry.defaultRegistry[id];
    },
  };
}
