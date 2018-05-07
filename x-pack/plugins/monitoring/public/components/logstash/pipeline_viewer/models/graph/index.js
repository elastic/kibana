/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { vertexFactory } from './vertex_factory';
import { edgeFactory } from './edge_factory';
import { QueueVertex } from './queue_vertex';
import { IfVertex } from './if_vertex';
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
    // We need a stable order for webcola
    // constraints don't work by anything other than index :(

    // Its safe to cache vertices because vertices are never added or removed from the graph. This is because
    // such changes also result in changing the hash of the pipeline, which ends up creating a new graph altogether.
    if (this.vertexCache === undefined) {
      this.vertexCache = Object.values(this.verticesById);
    }
    return this.vertexCache;
  }

  get inputVertices() {
    return this.getVertices().filter(v => v.isInput);
  }

  get queueVertex() {
    return this.getVertices().find(v => v instanceof QueueVertex);
  }

  get processorVertices() {
    return this.getVertices().filter(v => v.isProcessor);
  }

  get outputVertices() {
    return this.getVertices().filter(v => v.isOutput);
  }

  get ifVertices() {
    return this.getVertices().filter(v => v instanceof IfVertex);
  }

  get colaVertices() {
    return this.getVertices().map(v => v.cola);
  }

  get edges() {
    return Object.values(this.edgesById);
  }

  get colaEdges() {
    return this.edges.map(e => e.cola);
  }

  update(jsonRepresentation) {
    this.json = jsonRepresentation;

    jsonRepresentation.vertices.forEach(vJson => {
      const existingVertex = this.verticesById[vJson.id];
      if (existingVertex !== undefined) {
        existingVertex.update(vJson);
      } else {
        const newVertex = vertexFactory(this, vJson);
        this.verticesById[vJson.id] = newVertex;
      }
    });

    jsonRepresentation.edges.forEach(eJson => {
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

    // These maps are what the vertices use for their .rank and .reverseRank getters
    this.vertexRankById = this._bfs().distances;

    // A separate rank algorithm used for formatting purposes
    this.verticesByLayoutRank = this.calculateVerticesByLayoutRank();

    // For layout purposes we treat triangular ifs, that is to say
    // 'if' vertices of rank N with both T and F children at rank N+1
    // in special ways to get a clean render.
    this.triangularIfGroups = this.calculateTriangularIfGroups();

    this.annotateVerticesWithStages();
  }

  verticesByRank() {
    const byRank = [];
    Object.values(this.verticesById).forEach(vertex => {
      const rank = vertex.rank;
      if (byRank[rank] === undefined) {
        byRank[rank] = [];
      }
      byRank[rank].push(vertex);
    });
    return byRank;
  }

  // Can only be run after layout ranks are calculated!
  calculateTriangularIfGroups() {
    return this.getVertices().filter(v => {
      return v.typeString === 'if' &&
              !v.outgoingVertices.find(outV => outV.layoutRank !== (v.layoutRank + 1));
    }).map(ifV => {
      const trueEdge = ifV.outgoingEdges.filter(e => e.when === true)[0];
      const falseEdge = ifV.outgoingEdges.filter(e => e.when === false)[0];
      const result = { ifVertex: ifV };
      if (trueEdge) {
        result.trueVertex = trueEdge.to;
      }
      if (falseEdge) {
        result.falseVertex = falseEdge.to;
      }
      return result;
    });
  }

  calculateVerticesByLayoutRank() {
    // We will mutate this throughout this function
    // to produce our output
    const result = this.verticesByRank();

    // Find the rank of a vertex in our output
    // Normally you'd grab that information from `vertex.layoutRank`
    // but since we're recomputing that here we need something directly linked
    // to the intermediate result
    const rankOf = (vertex) => {
      const foundRankVertices = result.find((rankVertices) => {
        return rankVertices.find(v => v === vertex);
      });
      return result.indexOf(foundRankVertices);
    };

    // This function is really an engine for applying rules
    // These rules are evaluated in order. Each rule can produce one 'promotion', that is it
    // can specify that a single vertex of rank N be promoted to rank N+1
    // These rules will be repeatedly invoked on a rank's vertices until the rule has no effect
    // which is determined by the rule returning `null`
    const promotionRules = [
      // Our first rule is that vertices that are pointed to by other nodes within the rank, but do
      // not point to other nodes within the rank should be promoted
      // This produces a more desirable layout by mostly eliminating horizontal links, which must
      // cross over other links thus creating a confusing layout most of the time.
      (vertices) => {
        const found = vertices.find((v) => {
          const hasIncomingOfSameRank = v.incomingVertices.find(inV => rankOf(inV) === rankOf(v));
          const hasOutgoingOfSameRank = v.outgoingVertices.find(outV => rankOf(outV) === rankOf(v));
          return hasIncomingOfSameRank && hasOutgoingOfSameRank === undefined;
        });
        if (found) {
          return found;
        }

        return null;
      },
      // This rule is quite simple, simply limiting the maximum number of nodes in a rank to 3.
      // Beyond this number the graph becomes too compact, links often start crossing over each other
      // and readability suffers
      (vertices) => {
        if (vertices.length > 3) {
          return vertices[0];
        }
        return null;
      }
    ];

    // This is the core of this function, wherein we iterate through the ranks and apply the rules
    for (let rank = 0; rank < result.length; rank++) {
      const vertices = result[rank];
      // Iterate through each rule
      promotionRules.forEach(rule => {
        let ruleConverged = false;
        // Execute each rule against the vertices within the rank until the rule has no more
        // mutations to make
        while(!ruleConverged) {
          const promotedVertex = rule(vertices, result);
          // If the rule has found a vertex to promote
          if (promotedVertex !== null) {
            const promotedIndex = vertices.indexOf(promotedVertex);
            // move the vertex found by the rule from this rank and move it to the next one
            vertices.splice(promotedIndex, 1)[0];
            // We may be making a new rank, if so we'll need to seed it with an empty array
            if (result[rank + 1] === undefined) {
              result[rank + 1] = [];
            }
            result[rank + 1].push(promotedVertex);
          } else {
            ruleConverged = true;
          }
        }
      });
    }

    // Set separated rank as a property on each vertex
    for (let rank = 0; rank < result.length; rank++) {
      const rankVertices = result[rank];
      rankVertices.forEach(v => v.layoutRank = rank);
    }

    return result;
  }

  get roots() {
    return this.getVertices().filter((v) => v.isRoot);
  }

  get leaves() {
    return this.getVertices().filter((v) => v.isLeaf);
  }

  get maxRank() {
    return Math.max.apply(null, this.getVertices().map(v => v.rank));
  }

  _getReverseVerticesByRank() {
    return this.getVertices().reduce((acc, v) => {
      const rank = v.reverseRank;
      if (acc.get(rank) === undefined) {
        acc.set(rank, []);
      }
      acc.get(rank).push(v);
      return acc;
    }, new Map());
  }

  _bfs() {
    return this._bfsTraversalUsing(this.roots, 'outgoing');
  }

  _reverseBfs() {
    return this._bfsTraversalUsing(this.leaves, 'incoming');
  }

  /**
   * Performs a breadth-first or reverse-breadth-first search
   * @param {array} startingVertices Where to start the search - either this.roots (for breadth-first) or this.leaves (for reverse-breadth-first)
   * @param {string} vertexType Either 'outgoing' (for breadth-first) or 'incoming' (for reverse-breadth-first)
   */
  _bfsTraversalUsing(startingVertices, vertexType) {
    const distances = {};
    const parents = {};
    const queue = [];
    const vertexTypePropertyName = `${vertexType}Vertices`;

    startingVertices.forEach((v) => {
      distances[v.id] = 0;
      queue.push(v);
    });
    while (queue.length > 0) {
      const currentVertex = queue.shift();
      const currentDistance = distances[currentVertex.id];

      currentVertex[vertexTypePropertyName].forEach((vertex) => {
        if (distances[vertex.id] === undefined) {
          distances[vertex.id] = currentDistance + 1;
          parents[vertex.id] = currentVertex;
          queue.push(vertex);
        }
      });
    }

    return { distances, parents };
  }


  get startVertices() {
    return this.getVertices().filter(v => v.incomingEdges.length === 0);
  }

  get endVertices() {
    return this.getVertices().filter(v => v.outgoingEdges.length === 0);
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
    this.startVertices.forEach(v => v.pipelineStage = 'input');
  }

  /**
   * Annotate any output stage vertices as such
   */
  annotateOutputStageVertices() {
    // First, we perform a couple of simple short-circuiting checks.

    // If there is only one end vertex in this pipeline graph and it is the queue
    // vertex, then there are no output stage vertices so we are done here
    if ((this.endVertices.length === 1) && (this.endVertices[0] instanceof QueueVertex)) {
      return;
    }

    // Now we can guarantee that the end vertices are plugin vertices, in either the
    // filter or output stages of the pipeline. If they are filter plugin vertices, we
    // are done here
    if (this.endVertices.every(v => v.pluginType === 'filter')) {
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

      const isParentFilterPluginVertex = parents.some(p => p instanceof PluginVertex && p.pluginType === 'filter');
      const isParentQueueVertex = parents.some(p => p instanceof QueueVertex);
      const isParentNothing = parents.length === 0;

      const isParentOutputStageVertex = !(isParentFilterPluginVertex || isParentQueueVertex || isParentNothing);

      if (isParentOutputStageVertex) {
        pending.push(...parents);
      } else {
        currentVertex.pipelineStage = 'output';
        const descendantVertices = currentVertex.descendants().vertices;
        descendantVertices.forEach(v => v.pipelineStage = 'output');
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
