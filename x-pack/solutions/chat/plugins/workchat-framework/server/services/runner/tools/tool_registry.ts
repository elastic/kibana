/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  type Tool,
  type ToolProvider,
  type Registry,
  createToolProvider,
} from '@kbn/wc-framework-types-server';
import { SimpleRegistry } from '../../utils';

export type ToolRegistry = Registry<Tool> & {
  asToolProvider(): ToolProvider;
};

export const createToolRegistry = (): ToolRegistry => {
  return new ToolRegistryImpl();
};

class ToolRegistryImpl extends SimpleRegistry<Tool> implements ToolRegistry {
  asToolProvider(): ToolProvider {
    return createToolProvider(this.getAll());
  }
}
