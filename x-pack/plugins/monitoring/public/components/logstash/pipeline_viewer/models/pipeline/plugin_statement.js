/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Statement } from './statement';

export class PluginStatement extends Statement {
  constructor(vertex) {
    super(vertex);

    const {
      pluginType,
      name
    } = vertex;

    this.pluginType = pluginType; // input, filter, or output
    this.name = name; // twitter, grok, elasticsearch, etc.
  }

  static fromPipelineGraphVertex(pluginVertex) {
    return new PluginStatement(
      pluginVertex
    );
  }
}
