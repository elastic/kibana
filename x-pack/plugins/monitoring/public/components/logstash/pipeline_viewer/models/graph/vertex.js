/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { LOGSTASH } from '../../../../../../common/constants';

export class Vertex {
  constructor(graph, json) {
    this.graph = graph;
    this.update(json);

    // Version of the representation used by webcola
    // this object is a bridge back to here, and also can be mutated by webcola
    // and d3, which like to change objects
    this.cola = this._makeCola();
  }

  update(json) {
    this.json = json;
  }

  // Should only be called by the constructor!
  // There is no reason to have > 1 instance of this!
  // There is really no good reason to add any additional fields here
  _makeCola() {
    const margin = LOGSTASH.PIPELINE_VIEWER.GRAPH.VERTICES.MARGIN_PX;
    return {
      vertex: this,
      // The margin size must be added since this is actually the size of the bounding box
      width: LOGSTASH.PIPELINE_VIEWER.GRAPH.VERTICES.WIDTH_PX + margin,
      height: LOGSTASH.PIPELINE_VIEWER.GRAPH.VERTICES.HEIGHT_PX + margin
    };
  }

  get colaIndex() {
    if (!this._colaIndex) {
      this._colaIndex = this.graph.getVertices().indexOf(this);
    }
    return this._colaIndex;
  }

  get name() {
    return this.json.config_name;
  }

  get id() {
    return this.json.id;
  }

  get htmlAttrId() {
    // Substitute any non-word characters with an underscore so
    // D3 selections don't interpret them as special selector syntax
    return this.json.id.replace(/\W/g, '_');
  }

  get subtitle() {
    return {
      complete: this.id,
      display: this.truncateStringForDisplay(this.id, this.displaySubtitleMaxLength)
    };
  }

  get displaySubtitleMaxLength() {
    return 19;
  }

  get incomingEdges() {
    return this.graph.edgesByTo[this.json.id] || [];
  }

  get incomingVertices() {
    return this.incomingEdges.map(e => e.from);
  }

  get outgoingEdges() {
    return this.graph.edgesByFrom[this.json.id] || [];
  }

  get outgoingVertices() {
    return this.outgoingEdges.map(e => e.to);
  }

  get isRoot() {
    return this.incomingVertices.length === 0;
  }

  get isLeaf() {
    return this.outgoingVertices.length === 0;
  }

  get rank() {
    return this.graph.vertexRankById[this.id];
  }

  get sourceLocation() {
    return `apc.conf@${this.meta.source_line}:${this.meta.source_column}`;
  }

  get sourceText() {
    return this.meta.source_text;
  }

  get meta() {
    return this.json.meta;
  }

  get stats() {
    return this.json.stats || {};
  }

  get hasCustomStats() {
    return Object.keys(this.customStats).length > 0;
  }
  get customStats() {
    return Object.keys(this.stats)
      .filter(k => !(k.match(/^events\./)))
      .filter(k => k !== 'name')
      .reduce((acc, k) => {
        acc[k] = this.stats[k];
        return acc;
      }, {});
  }

  lineage() {
    const ancestors = this.ancestors();
    const descendants = this.descendants();

    const vertices = [];
    vertices.push.apply(vertices, ancestors.vertices);
    vertices.push(this);
    vertices.push.apply(vertices, descendants.vertices);

    const edges = ancestors.edges.concat(descendants.edges);

    return { vertices, edges };
  }

  ancestors() {
    const vertices = [];
    const edges = [];
    const pending = [this];
    const seen = {};
    while (pending.length > 0) {
      const vertex = pending.pop();
      vertex.incomingEdges.forEach(edge => {
        edges.push(edge);
        const from = edge.from;
        if (seen[from.id] !== true) {
          vertices.push(from);
          pending.push(from);
          seen[from.id] = true;
        }
      });
    }
    return { vertices, edges };
  }

  descendants() {
    const vertices = [];
    const edges = [];
    const pending = [this];
    const seen = {};
    while (pending.length > 0) {
      const vertex = pending.pop();
      vertex.outgoingEdges.forEach(edge => {
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

  get eventsPerCurrentPeriod() {
    if (!this.stats.hasOwnProperty('events.in')) {
      return null;
    }

    return (this.stats['events.in'].max - this.stats['events.in'].min);
  }

  get hasExplicitId() {
    return Boolean(this.json.explicit_id);
  }

  truncateStringForDisplay(completeString, maxDisplayLength) {
    if (completeString.length <= maxDisplayLength) {
      return completeString;
    }

    const ellipses = ' \u2026 ';
    const eachHalfMaxDisplayLength = Math.floor((maxDisplayLength - ellipses.length) / 2);

    return `${completeString.substr(0, eachHalfMaxDisplayLength)}${ellipses}${completeString.substr(-eachHalfMaxDisplayLength)}`;
  }
}
