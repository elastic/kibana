/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import d3 from 'd3';
import { PluginVertex } from '../models/graph/plugin_vertex';
import { IfVertex } from '../models/graph/if_vertex';
import { QueueVertex } from '../models/graph/queue_vertex';
import {
  enterInputVertex,
  enterProcessorVertex,
  enterIfVertex,
  enterQueueVertex,
  updateInputVertex,
  updateProcessorVertex
} from './vertex_content_renderer';
import { LOGSTASH } from '../../../../../common/constants';
import { makeEdgeBetween, d3adaptor } from 'webcola';

function makeMarker(svgDefs, id, fill) {
  svgDefs.append('marker')
    .attr('id', id)
    .attr('viewBox', '0 -5 10 10')
    .attr('refX', 5)
    .attr('markerWidth', 3)
    .attr('markerHeight', 3)
    .attr('orient', 'auto')
    .append('path')
    .attr('d', 'M0,-5L10,0L0,5L2,0')
    .attr('stroke-width', '0px')
    .attr('fill', fill);
}

function makeBackground(parentEl) {
  return parentEl
    .append('rect')
    .attr('width', '100%')
    .attr('height', '100%')
    .attr('fill', '#efefef');
}

function makeGroup(parentEl) {
  return parentEl
    .append('g');
}

function makeNodes(nodesLayer, colaVertices) {
  const nodes = nodesLayer
    .selectAll('.lspvVertex')
    .data(colaVertices, d => d.vertex.htmlAttrId);

  nodes
    .enter()
    .append('g')
    .attr('id', d => `nodeg-${d.vertex.htmlAttrId}`)
    .attr('class', d => `lspvVertex ${d.vertex.typeString}`)
    .attr('width', LOGSTASH.PIPELINE_VIEWER.GRAPH.VERTICES.WIDTH_PX)
    .attr('height', LOGSTASH.PIPELINE_VIEWER.GRAPH.VERTICES.HEIGHT_PX);

  nodes
    .append('rect')
    .attr('class', 'lspvVertexBounding')
    .attr('rx', LOGSTASH.PIPELINE_VIEWER.GRAPH.VERTICES.BORDER_RADIUS_PX)
    .attr('ry', LOGSTASH.PIPELINE_VIEWER.GRAPH.VERTICES.BORDER_RADIUS_PX);

  return nodes;
}

function addNodesMouseBehaviors(nodes, onMouseover, onMouseout, onMouseclick) {
  nodes.on('mouseover', onMouseover);
  nodes.on('mouseout', onMouseout);
  nodes.on('click', onMouseclick);
}

function makeInputNodes(nodes) {
  const inputs = nodes.filter(node => (node.vertex instanceof PluginVertex) && node.vertex.isInput);
  inputs.call(enterInputVertex);

  return inputs;
}

function makeProcessorNodes(nodes) {
  const processors = nodes.filter(node => (node.vertex instanceof PluginVertex) && node.vertex.isProcessor);
  processors.call(enterProcessorVertex);

  return processors;
}

function makeIfNodes(nodes) {
  const ifs = nodes.filter(d => d.vertex instanceof IfVertex);
  ifs.call(enterIfVertex);

  return ifs;
}

function makeQueueNode(nodes) {
  const queue = nodes.filter(d => d.vertex instanceof QueueVertex);
  queue.call(enterQueueVertex);

  return queue;
}

// Line function for drawing paths between nodes
const lineFunction = d3.svg.line()
  // Null check that handles a bug in webcola where sometimes these values are null for a tick
  .x(d => d ? d.x : null)
  .y(d => d ? d.y : null);

export class ColaGraph extends React.Component {
  constructor() {
    super();
    this.state = {};

    this.width = 1000;
    this.height = 1000;
  }

  renderGraph(svgEl) {
    this.d3cola = d3adaptor()
      .avoidOverlaps(true)
      .size([this.width, this.height]);

    const outer = d3.select(svgEl);
    const background = makeBackground(outer);

    const svgDefs = outer.append('defs');
    makeMarker(svgDefs, 'lspvPlainMarker', '#000');
    makeMarker(svgDefs, 'lspvTrueMarker', '#1BAFD2');
    makeMarker(svgDefs, 'lspvFalseMarker', '#EE408A');

    // Set initial zoom to 100%. You need both the translate and scale options
    const zoom = d3.behavior.zoom().translate([100, 100]).scale(1);
    const vis = outer
      .append('g')
      .attr('transform', 'translate(0,0) scale(1)');

    const redraw = () => {
      vis.attr('transform', `translate(${d3.event.translate}) scale(${d3.event.scale})`);
    };

    outer.call(d3.behavior.zoom().on('zoom', redraw));
    background.call(zoom.on('zoom', redraw));

    this.nodesLayer = makeGroup(vis);
    this.nodes = makeNodes(this.nodesLayer, this.graph.colaVertices);

    this.inputs = makeInputNodes(this.nodes);
    this.processors = makeProcessorNodes(this.nodes);
    this.ifs = makeIfNodes(this.nodes);
    this.queue = makeQueueNode(this.nodes);

    addNodesMouseBehaviors(this.nodes, this.onMouseover, this.onMouseout, this.onMouseclick);

    this.linksLayer = makeGroup(vis);

    const ifTriangleColaGroups = this.graph.triangularIfGroups.map(group => {
      return { leaves: Object.values(group).map(v => v.colaIndex) };
    });

    this.d3cola
      .nodes(this.graph.colaVertices)
      .links(this.graph.colaEdges)
      .groups(ifTriangleColaGroups)
      .constraints(this._getConstraints())
    // This number controls the max number of iterations for the layout iteration to
    // solve the constraints. Higher numbers usually wind up in a better layout
      .start(10000);

    this.makeLinks();

    let tickStart;
    let ticks = 0;

    // Minimum amount of time between reflows
    // We want a value that looks interactive but doesn't waste CPU time rendering intermediate results
    const reflowEvery = 1000; // 1s
    // Amount of time to allow the solver to run
    // We want a value that isn't so long that the user gets irritated using the graph due to the CPU being monopolized
    // by the constraint solver
    const maxDuration = 10000; // 10s
    let lastReflow = new Date();
    this.d3cola
      .on('tick', () => {
        const now = new Date();

        ticks++;
        if (ticks === 1) {
          tickStart = now;
        }

        const elapsedSinceLastReflow = now - lastReflow;
        if (ticks === 1 || elapsedSinceLastReflow >= reflowEvery) {
          this.reflow();
          lastReflow = now;
        }
        const totalElapsed = now - tickStart;
        if (totalElapsed >= maxDuration) {
          this.d3cola.stop();
          this.reflow();
          console.log("Logstash graph visualizer constraint timeout! Rendering will stop here.");
        }
      })
      .on('end', this.reflow);
  }

  // Actually render the latest webcola state
  reflow = () => {
    this.setNodeBounds();
    this.routeAndLabelEdges();
  }

  setNodeBounds = () => {
    this.nodes.each((d) => d.innerBounds = d.bounds.inflate(-LOGSTASH.PIPELINE_VIEWER.GRAPH.VERTICES.MARGIN_PX));
    this.nodes.attr('transform', (d) => `translate(${d.innerBounds.x}, ${d.innerBounds.y})`);
    this.nodes.select('rect')
      .attr('width', (d) => d.innerBounds.width())
      .attr('height', (d) => d.innerBounds.height());
  }

  routeAndLabelEdges = () => {
    this.links.attr('d', (d) => {
      const arrowStart = LOGSTASH.PIPELINE_VIEWER.GRAPH.EDGES.ARROW_START;
      const route = makeEdgeBetween(d.source.innerBounds, d.target.innerBounds, arrowStart);
      return lineFunction([route.sourceIntersection, route.arrowStart]);
    });
    this.routeEdges();
    this.labelEdges();
  }

  routeEdges() {
    this.d3cola.prepareEdgeRouting(LOGSTASH.PIPELINE_VIEWER.GRAPH.EDGES.ROUTING_MARGIN_PX);
    this.links.select('path').attr('d', (d) => {
      try {
        return lineFunction(this.d3cola.routeEdge(d));
      } catch (err) {
        console.error('Could not exec line function!', err);
      }
    });
  }

  labelEdges() {
    // Use a regular function instead of () => since we want the dom element via `this`,
    // only accessible via d3 setting 'this' AFAIK
    this.booleanLabels.each(function () {
      const path = d3.select(this.parentNode).select('path')[0][0];
      const pathLength = path.getTotalLength();
      if (pathLength === 0) {
        return;
      }

      const center = path.getPointAtLength(pathLength / 2);
      const group = d3.select(this);
      group.select('circle')
        .attr('cx', center.x)
        .attr('cy', center.y);

      // Offset by to vertically center the text
      const textVerticalOffset = 5;
      group.select('text')
        .attr('x', center.x)
        .attr('y', center.y + textVerticalOffset);
    });
  }

  makeLinks() {
    this.links = this.linksLayer.selectAll('.link')
      .data(this.graph.colaEdges);

    const linkGroup = this.links.enter()
      .append('g')
      .attr('id', (d) => `lspvEdge-${d.edge.htmlAttrId}`)
      .attr('class', (d) => d.edge.svgClass);
    linkGroup.append('path');

    const booleanLinks = linkGroup.filter('.lspvEdgeBoolean');
    this.booleanLabels = booleanLinks
      .append('g')
      .attr('class', 'lspvBooleanLabel');

    this.booleanLabels
      .append('circle')
      .attr('r', LOGSTASH.PIPELINE_VIEWER.GRAPH.EDGES.LABEL_RADIUS);
    this.booleanLabels
      .append('text')
      .attr('text-anchor', 'middle') // Position the text on its vertical
      .text(d => d.edge.when ? 'T' : 'F');
  }

  updateGraph(nextProps = {}, nextState = {}) {
    this.processors.call(updateProcessorVertex);
    this.inputs.call(updateInputVertex);

    this.nodesLayer.selectAll('.lspvVertexBounding-highlighted').classed('lspvVertexBounding-highlighted', false);
    this.nodesLayer.selectAll('.lspvVertex-grayed').classed('lspvVertex-grayed', false);
    this.linksLayer.selectAll('.lspvEdge-grayed').classed('lspvEdge-grayed', false);

    const hoverNode = nextState.hoverNode;
    if (hoverNode) {
      const selection = this.nodesLayer
        .selectAll('#nodeg-' + hoverNode.vertex.htmlAttrId)
        .selectAll('rect');
      selection.classed('lspvVertexBounding-highlighted', true);

      const lineage = hoverNode.vertex.lineage();

      const lineageVertices = lineage.vertices;
      const nonLineageVertices = this.graph.getVertices().filter(v => lineageVertices.indexOf(v) === -1);
      const grayedVertices = this.nodesLayer.selectAll('g.lspvVertex').filter(d => nonLineageVertices.indexOf(d.vertex) >= 0);
      grayedVertices.classed('lspvVertex-grayed', true);

      const lineageEdges = lineage.edges;
      const nonLineageEdges = this.graph.edges.filter(e => lineageEdges.indexOf(e) === -1);
      const grayedEdges = this.linksLayer.selectAll('.lspvEdge').filter(d => nonLineageEdges.indexOf(d.edge) >= 0);
      grayedEdges.classed('lspvEdge-grayed', true);
    }

    const detailVertex = nextProps.detailVertex;
    if (detailVertex) {
      const selection = this.nodesLayer
        .selectAll('#nodeg-' + detailVertex.htmlAttrId)
        .selectAll('rect');
      selection.classed('lspvVertexBounding-highlighted', true);
    }
  }

  onMouseover = (node) => {
    this.setState({ hoverNode: node });
  }

  onMouseout = () => {
    this.setState({ hoverNode: null });
  }

  onMouseclick = (e) => {
    this.props.onShowVertexDetails(e.vertex);
  }

  get graph() {
    return this.props.graph;
  }

  _getConstraints() {
    // To understand webcola constraints please read:
    // https://github.com/tgdwyer/WebCola/wiki/Constraints
    const constraints = [];
    const verticesByRank = this.graph.verticesByLayoutRank;

    // Lay out triangle groups as... a triangle! That is to say,
    // with an if in the middle and the true on the left and the false on the right
    this.graph.triangularIfGroups.forEach(group => {
      if (group.trueVertex && group.falseVertex) {
        Object.values(group).forEach(v => v.isInTriangleGroup = true);
        constraints.push({
          type: 'alignment',
          axis: 'x',
          offsets: [
            { node: group.ifVertex.colaIndex, offset: 0 },
            // The offsets here are oddly sensitive. If you use lower values than the width of
            // the node the layout gets all crazy and overlappy for reasons I don't understand
            { node: group.trueVertex.colaIndex, offset: -LOGSTASH.PIPELINE_VIEWER.GRAPH.VERTICES.WIDTH_PX },
            { node: group.falseVertex.colaIndex, offset: LOGSTASH.PIPELINE_VIEWER.GRAPH.VERTICES.WIDTH_PX }
          ]
        });
      }
    });

    for (let rank = 0; rank < verticesByRank.length; rank++) {
      const vertices = verticesByRank[rank];

      // Ensure that nodes of an equal rank are aligned on the y axis.
      constraints.push(
        {
          type: 'alignment',
          axis: 'y',
          offsets: vertices.map(v => {
            return { node: v.colaIndex, offset: 0 };
          })
        }
      );

      if (rank > 0) {
        const previousVertices = verticesByRank[rank - 1];

        // Prevent sibling nodes from overlapping
        vertices.forEach((vertex, index) => {
          const previousParents = previousVertices.filter(previousVertex => {
            return previousVertex.outgoingVertices.find(v => v === vertex);
          });

          const nodeXGap = LOGSTASH.PIPELINE_VIEWER.GRAPH.VERTICES.WIDTH_PX + LOGSTASH.PIPELINE_VIEWER.GRAPH.VERTICES.MARGIN_PX;
          const rightSibling = vertices[index + 1];
          // We don't need to add constraints for nodes in triangle groups since they have
          // a constraint that keeps them separately already
          if (rightSibling && !rightSibling.isInTriangleGroup && !vertex.isInTriangleGroup) {
            constraints.push({
              axis: "x",
              right: vertex.colaIndex,
              left: rightSibling.colaIndex,
              gap: nodeXGap
            });
          }

          // Ensure that nodes of rank N that have a single outbound connection to a node of rank N+1
          // are positioned vertically inline
          // We start by checking if the current node has exactly one parent in the previous rank
          // if it has > 1 parent then we don't really know where to put it
          if (previousParents.length === 1) {
            const previousParent = previousParents[0];
            // We further check that the connected parent isn't also connected to other nodes in this rank
            // otherwise the nodes would have to overlap if we aligned them
            if (previousParent.outgoingVertices.filter(v => v.layoutRank === rank).length === 1) {
              constraints.push({
                axis: 'x',
                left: previousParent.colaIndex,
                right: vertex.colaIndex,
                gap: 0,
                equality: true
              });
            }
          }

          // Ensure that all nodes of a given rank are at the same exact distance below others
          previousVertices.forEach(previousVertex => {
            constraints.push({
              axis: 'y',
              left: previousVertex.colaIndex,
              right: vertex.colaIndex,
              // Multiplying the gap by two works much better for large graphs giving more space to route edges
              gap: LOGSTASH.PIPELINE_VIEWER.GRAPH.VERTICES.HEIGHT_PX * 2,
              equality: true
            });
          });
        });
      }
    }

    return constraints;
  }

  render() {
    const viewBox = `0,0,${this.width},${this.height}`;
    return (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        ref={svgEl => this.renderGraph(svgEl)}
        width="100%"
        height="100%"
        preserveAspectRatio="xMinYMin meet"
        viewBox={viewBox}
        pointerEvents="all"
      />
    );
  }

  componentDidMount() {
    this.updateGraph();
  }

  shouldComponentUpdate(nextProps, nextState) {
    // Let D3 control updates to this component's DOM.
    this.updateGraph(nextProps, nextState);

    // Since D3 is controlling any updates to this component's DOM,
    // we don't want React to update this component's DOM.
    return false;
  }
}
