/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { PluginVertex } from './plugin_vertex';
import { IfVertex } from './if_vertex';
import { QueueVertex } from './queue_vertex';

export function vertexFactory(graph, vertexJson) {
  const type = vertexJson.type;
  switch (type) {
    case 'plugin':
      return new PluginVertex(graph, vertexJson);
    case 'if':
      return new IfVertex(graph, vertexJson);
    case 'queue':
      return new QueueVertex(graph, vertexJson);
    default:
      throw new Error(`Unknown vertex type ${type}! This shouldn't happen!`);
  }
}
