/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { vertexFactory } from './vertex_factory';
import { edgeFactory } from './edge_factory';
import { QueueVertex } from './queue_vertex';
import { PluginVertex } from './plugin_vertex';

export class Graph {
  constructor() {
    this.json = null;
    this.verticesById = {};
    this.edgesById = {};
    this.edgesByFrom = {};
    this.edgesByTo = {};
  }

  getVertexById(id) {
    return this.verticesById[id];
  }

  getVertices() {
    // Its safe to cache vertices because vertices are never added or removed from the graph. This is because
    // such changes also result in changing the hash of the pipeline, which ends up creating a new graph altogether.
    if (this.vertexCache === undefined) {
      this.vertexCache = Object.values(this.verticesById);
    }
    return this.vertexCache;
  }

  get queueVertex() {
    return this.getVertices().find((v) => v instanceof QueueVertex);
  }

  get processorVertices() {
    return this.getVertices().filter((v) => v.isProcessor);
  }

  get edges() {
    return Object.values(this.edgesById);
  }

  update(jsonRepresentation) {
    this.json = jsonRepresentation;

    jsonRepresentation.vertices.forEach((vJson) => {
      const existingVertex = this.verticesById[vJson.id];
      if (existingVertex !== undefined) {
        existingVertex.update(vJson);
      } else {
        const newVertex = vertexFactory(this, vJson);
        this.verticesById[vJson.id] = newVertex;
      }
    });

    jsonRepresentation.edges.forEach((eJson) => {
      const existingEdge = this.edgesById[eJson.id];
      if (existingEdge !== undefined) {
        existingEdge.update(eJson);
      } else {
        const newEdge = edgeFactory(this, eJson);
        this.edgesById[eJson.id] = newEdge;
        if (this.edgesByFrom[newEdge.from.json.id] === undefined) {
          this.edgesByFrom[newEdge.from.json.id] = [];
        }
        this.edgesByFrom[newEdge.from.json.id].push(newEdge);

        if (this.edgesByTo[newEdge.to.json.id] === undefined) {
          this.edgesByTo[newEdge.to.json.id] = [];
        }
        this.edgesByTo[newEdge.to.json.id].push(newEdge);
      }
    });

    this.annotateVerticesWithStages();
  }

  get startVertices() {
    return this.getVertices().filter((v) => v.incomingEdges.length === 0);
  }

  get endVertices() {
    return this.getVertices().filter((v) => v.outgoingEdges.length === 0);
  }

  get hasQueueVertex() {
    return !!this.queueVertex;
  }

  /**
   * Give each vertex a pipeline stage (input, filter, or output)
   */
  annotateVerticesWithStages() {
    // NOTE: order of the following statements is important. In particular,
    // it is important to annotate output stage vertices BEFORE annotating
    // filter stage vertices as the latter requires the former.
    this.annotateInputStageVertices();
    this.annotateOutputStageVertices();
    this.annotateFilterStageVertices();
  }

  /**
   * Annotate any input stage vertices as such
   */
  annotateInputStageVertices() {
    // A Queue vertex exists if and only if there are input stage vertices

    // If there is no Queue vertex, there are no input stage vertices so we are done
    if (!this.hasQueueVertex) {
      return;
    }

    // At this point, we know there are input stage vertices. Further, they
    // must be all the start vertices of the graph
    this.startVertices.forEach((v) => (v.pipelineStage = 'input'));
  }

  /**
   * Annotate any output stage vertices as such
   */
  annotateOutputStageVertices() {
    // First, we perform a couple of simple short-circuiting checks.

    // If there is only one end vertex in this pipeline graph and it is the queue
    // vertex, then there are no output stage vertices so we are done here
    if (this.endVertices.length === 1 && this.endVertices[0] instanceof QueueVertex) {
      return;
    }

    // Now we can guarantee that the end vertices are plugin vertices, in either the
    // filter or output stages of the pipeline. If they are filter plugin vertices, we
    // are done here
    if (this.endVertices.every((v) => v.pluginType === 'filter')) {
      return;
    }

    // Now we can guarantee that the end vertices are output plugin vertices. Starting
    // from these, we work our way backwards (via our parents) until one of our parents
    // is either:
    // - a filter plugin vertex (for pipelines with a filter stage), or
    // - the queue vertex (for pipelines with an input stage but no filter stage), or
    // - nothing (for pipelines with neither an input stage nor a filter stage)
    // When we reach one of these cases, we annotate the current vertex and its descendants
    // as output stage vertices
    const pending = [...this.endVertices];
    while (pending.length > 0) {
      const currentVertex = pending.shift();
      const parents = currentVertex.incomingVertices;

      const isParentFilterPluginVertex = parents.some(
        (p) => p instanceof PluginVertex && p.pluginType === 'filter'
      );
      const isParentQueueVertex = parents.some((p) => p instanceof QueueVertex);
      const isParentNothing = parents.length === 0;

      const isParentOutputStageVertex = !(
        isParentFilterPluginVertex ||
        isParentQueueVertex ||
        isParentNothing
      );

      if (isParentOutputStageVertex) {
        pending.push(...parents);
      } else {
        currentVertex.pipelineStage = 'output';
        const descendantVertices = currentVertex.descendants().vertices;
        descendantVertices.forEach((v) => (v.pipelineStage = 'output'));
      }
    }
  }

  /**
   * Annotate any filter stage vertices as such
   * PRE-CONDITION: All other stage vertices have been annotated
   */
  annotateFilterStageVertices() {
    const pending = [];
    if (this.hasQueueVertex) {
      pending.push(...this.queueVertex.outgoingVertices);
    } else {
      pending.push(...this.startVertices);
    }

    while (pending.length > 0) {
      const currentVertex = pending.shift();
      if (!currentVertex.pipelineStage) {
        currentVertex.pipelineStage = 'filter';
        pending.push(...currentVertex.outgoingVertices);
      }
    }
  }
}
