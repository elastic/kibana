/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

export class Vertex {
  constructor(graph, json) {
    this.graph = graph;
    this.update(json);
  }

  update(json) {
    this.json = json;
  }

  get name() {
    return this.json.config_name;
  }

  get id() {
    return this.json.id;
  }

  get subtitle() {
    return this.id;
  }

  get incomingEdges() {
    return this.graph.edgesByTo[this.json.id] || [];
  }

  get incomingVertices() {
    return this.incomingEdges.map((e) => e.from);
  }

  get outgoingEdges() {
    return this.graph.edgesByFrom[this.json.id] || [];
  }

  get outgoingVertices() {
    return this.outgoingEdges.map((e) => e.to);
  }

  get meta() {
    return this.json.meta;
  }

  get stats() {
    return this.json.stats || {};
  }

  descendants() {
    const vertices = [];
    const edges = [];
    const pending = [this];
    const seen = {};
    while (pending.length > 0) {
      const vertex = pending.pop();
      vertex.outgoingEdges.forEach((edge) => {
        edges.push(edge);
        const to = edge.to;
        if (seen[to.id] !== true) {
          vertices.push(to);
          seen[to.id] = true;
          pending.push(to);
        }
      });
    }
    return { vertices, edges };
  }

  get hasExplicitId() {
    return Boolean(this.json.explicit_id);
  }
}
