/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { LOGSTASH } from '../../../../../../common/constants';

export class Edge {
  constructor(graph, json) {
    this.graph = graph;
    this.update(json);

    this.cola = this._makeCola();
  }

  _makeCola() {
    return {
      edge: this,
      source: this.from.cola,
      target: this.to.cola
    };
  }

  update(json) {
    this.json = json;
  }

  get id() {
    return this.json.id;
  }

  get htmlAttrId() {
    // Substitute any non-word characters with an underscore so
    // D3 selections don't interpret them as special selector syntax
    return this.json.id.replace(/\W/, '_');
  }

  get from() {
    return this.graph.verticesById[this.fromId];
  }

  get fromId() {
    return this.json.from;
  }

  get to() {
    return this.graph.verticesById[this.toId];
  }

  get toId() {
    return this.json.to;
  }

  get svgClass() {
    return LOGSTASH.PIPELINE_VIEWER.GRAPH.EDGES.SVG_CLASS;
  }
}
