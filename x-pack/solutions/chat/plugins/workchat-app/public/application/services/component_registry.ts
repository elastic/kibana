/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

export interface ComponentRegistryEntry {
  component: React.ComponentType<any>;
}

export class ComponentRegistry {
  private components = new Map<string, ComponentRegistryEntry>();

  register(path: string, entry: ComponentRegistryEntry) {
    console.log(`ComponentRegistry: Registering component for path: ${path}`);
    this.components.set(path, entry);
  }

  get(path: string): ComponentRegistryEntry | undefined {
    console.log(`ComponentRegistry: Getting component for path: ${path}`);
    const entry = this.components.get(path);
    if (!entry) {
      console.warn(`ComponentRegistry: No component found for path: ${path}`);
    }
    return entry;
  }

  has(path: string): boolean {
    return this.components.has(path);
  }

  getAll(): string[] {
    return Array.from(this.components.keys());
  }
}

// Global singleton instance
export const componentRegistry = new ComponentRegistry();
