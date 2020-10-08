/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import $ from 'jquery';

// Kibana wrapper
import d3 from 'd3';

// Pluggable function to handle the comms with a server. Default impl here is
// for use outside of Kibana server with direct access to elasticsearch
let graphExplorer = function (indexName, typeName, request, responseHandler) {
  const dataForServer = JSON.stringify(request);
  $.ajax({
    type: 'POST',
    url: 'http://localhost:9200/' + indexName + '/_graph/explore',
    dataType: 'json',
    contentType: 'application/json;charset=utf-8',
    async: true,
    data: dataForServer,
    success: function (data) {
      responseHandler(data);
    },
  });
};
let searcher = function (indexName, request, responseHandler) {
  const dataForServer = JSON.stringify(request);
  $.ajax({
    type: 'POST',
    url: 'http://localhost:9200/' + indexName + '/_search?rest_total_hits_as_int=true',
    dataType: 'json',
    contentType: 'application/json;charset=utf-8', //Not sure why this was necessary - worked without elsewhere
    async: true,
    data: dataForServer,
    success: function (data) {
      responseHandler(data);
    },
  });
};

// ====== Undo operations =============

function AddNodeOperation(node, owner) {
  const self = this;
  const vm = owner;
  self.node = node;
  self.undo = function () {
    vm.arrRemove(vm.nodes, self.node);
    vm.arrRemove(vm.selectedNodes, self.node);
    self.node.isSelected = false;

    delete vm.nodesMap[self.node.id];
  };
  self.redo = function () {
    vm.nodes.push(self.node);
    vm.nodesMap[self.node.id] = self.node;
  };
}

function AddEdgeOperation(edge, owner) {
  const self = this;
  const vm = owner;
  self.edge = edge;
  self.undo = function () {
    vm.arrRemove(vm.edges, self.edge);
    delete vm.edgesMap[self.edge.id];
  };
  self.redo = function () {
    vm.edges.push(self.edge);
    vm.edgesMap[self.edge.id] = self.edge;
  };
}

function ReverseOperation(operation) {
  const self = this;
  const reverseOperation = operation;
  self.undo = reverseOperation.redo;
  self.redo = reverseOperation.undo;
}

function GroupOperation(receiver, orphan) {
  const self = this;
  self.receiver = receiver;
  self.orphan = orphan;
  self.undo = function () {
    self.orphan.parent = undefined;
  };
  self.redo = function () {
    self.orphan.parent = self.receiver;
  };
}

function UnGroupOperation(parent, child) {
  const self = this;
  self.parent = parent;
  self.child = child;
  self.undo = function () {
    self.child.parent = self.parent;
  };
  self.redo = function () {
    self.child.parent = undefined;
  };
}

// The main constructor for our GraphWorkspace
function GraphWorkspace(options) {
  const self = this;
  this.blocklistedNodes = [];
  this.options = options;
  this.undoLog = [];
  this.redoLog = [];
  this.selectedNodes = [];

  if (!options) {
    this.options = {};
  }
  this.nodesMap = {};
  this.edgesMap = {};
  this.searchTerm = '';

  //A sequence number used to know when a node was added
  this.seqNumber = 0;

  this.nodes = [];
  this.edges = [];
  this.lastRequest = null;
  this.lastResponse = null;
  this.changeHandler = options.changeHandler;
  if (options.graphExploreProxy) {
    graphExplorer = options.graphExploreProxy;
  }
  if (options.searchProxy) {
    searcher = options.searchProxy;
  }

  this.addUndoLogEntry = function (undoOperations) {
    self.undoLog.push(undoOperations);
    if (self.undoLog.length > 50) {
      //Remove the oldest
      self.undoLog.splice(0, 1);
    }
    self.redoLog = [];
  };

  this.undo = function () {
    const lastOps = this.undoLog.pop();
    if (lastOps) {
      this.stopLayout();
      this.redoLog.push(lastOps);
      lastOps.forEach((ops) => ops.undo());
      this.runLayout();
    }
  };
  this.redo = function () {
    const lastOps = this.redoLog.pop();
    if (lastOps) {
      this.stopLayout();
      this.undoLog.push(lastOps);
      lastOps.forEach((ops) => ops.redo());
      this.runLayout();
    }
  };

  //Determines if 2 nodes are connected via an edge
  this.areLinked = function (a, b) {
    if (a === b) return true;
    this.edges.forEach((e) => {
      if (e.source === a && e.target === b) {
        return true;
      }
      if (e.source === b && e.target === a) {
        return true;
      }
    });
    return false;
  };

  //======== Selection functions ========

  this.selectAll = function () {
    self.selectedNodes = [];
    self.nodes.forEach((node) => {
      if (node.parent === undefined) {
        node.isSelected = true;
        self.selectedNodes.push(node);
      } else {
        node.isSelected = false;
      }
    });
  };

  this.selectNone = function () {
    self.selectedNodes = [];
    self.nodes.forEach((node) => {
      node.isSelected = false;
    });
  };

  this.selectInvert = function () {
    self.selectedNodes = [];
    self.nodes.forEach((node) => {
      if (node.parent !== undefined) {
        return;
      }
      node.isSelected = !node.isSelected;
      if (node.isSelected) {
        self.selectedNodes.push(node);
      }
    });
  };

  this.selectNodes = function (nodes) {
    nodes.forEach((node) => {
      node.isSelected = true;
      if (self.selectedNodes.indexOf(node) < 0) {
        self.selectedNodes.push(node);
      }
    });
  };

  this.selectNode = function (node) {
    node.isSelected = true;
    if (self.selectedNodes.indexOf(node) < 0) {
      self.selectedNodes.push(node);
    }
  };

  this.deleteSelection = function () {
    let allAndGrouped = self.returnUnpackedGroupeds(self.selectedNodes);

    // Nothing selected so process all nodes
    if (allAndGrouped.length === 0) {
      allAndGrouped = self.nodes.slice(0);
    }

    const undoOperations = [];
    allAndGrouped.forEach((node) => {
      //We set selected to false because despite being deleted, node objects sit in an undo log
      node.isSelected = false;
      delete self.nodesMap[node.id];
      undoOperations.push(new ReverseOperation(new AddNodeOperation(node, self)));
    });
    self.arrRemoveAll(self.nodes, allAndGrouped);
    self.arrRemoveAll(self.selectedNodes, allAndGrouped);

    const danglingEdges = self.edges.filter(function (edge) {
      return self.nodes.indexOf(edge.source) < 0 || self.nodes.indexOf(edge.target) < 0;
    });
    danglingEdges.forEach((edge) => {
      delete self.edgesMap[edge.id];
      undoOperations.push(new ReverseOperation(new AddEdgeOperation(edge, self)));
    });
    self.addUndoLogEntry(undoOperations);
    self.arrRemoveAll(self.edges, danglingEdges);
    self.runLayout();
  };

  this.selectNeighbours = function () {
    const newSelections = [];
    self.edges.forEach((edge) => {
      if (!edge.topSrc.isSelected) {
        if (self.selectedNodes.indexOf(edge.topTarget) >= 0) {
          if (newSelections.indexOf(edge.topSrc) < 0) {
            newSelections.push(edge.topSrc);
          }
        }
      }
      if (!edge.topTarget.isSelected) {
        if (self.selectedNodes.indexOf(edge.topSrc) >= 0) {
          if (newSelections.indexOf(edge.topTarget) < 0) {
            newSelections.push(edge.topTarget);
          }
        }
      }
    });
    newSelections.forEach((newlySelectedNode) => {
      self.selectedNodes.push(newlySelectedNode);
      newlySelectedNode.isSelected = true;
    });
  };

  this.selectNone = function () {
    self.selectedNodes.forEach((node) => {
      node.isSelected = false;
    });
    self.selectedNodes = [];
  };

  this.deselectNode = function (node) {
    node.isSelected = false;
    self.arrRemove(self.selectedNodes, node);
  };

  this.getAllSelectedNodes = function () {
    return this.returnUnpackedGroupeds(self.selectedNodes);
  };

  this.colorSelected = function (colorNum) {
    self.getAllSelectedNodes().forEach((node) => {
      node.color = colorNum;
    });
  };

  this.getSelectionsThatAreGrouped = function () {
    const result = [];
    self.selectedNodes.forEach((node) => {
      if (node.numChildren > 0) {
        result.push(node);
      }
    });
    return result;
  };

  this.ungroupSelection = function () {
    self.getSelectionsThatAreGrouped().forEach((node) => {
      self.ungroup(node);
    });
  };

  this.toggleNodeSelection = function (node) {
    if (node.isSelected) {
      self.deselectNode(node);
    } else {
      node.isSelected = true;
      self.selectedNodes.push(node);
    }
    return node.isSelected;
  };

  this.returnUnpackedGroupeds = function (topLevelNodeArray) {
    //Gather any grouped nodes that are part of this top-level selection
    const result = topLevelNodeArray.slice();

    // We iterate over edges not nodes because edges conveniently hold the top-most
    // node information.

    const edges = this.edges;
    for (let i = 0; i < edges.length; i++) {
      const edge = edges[i];

      const topLevelSource = edge.topSrc;
      const topLevelTarget = edge.topTarget;

      if (result.indexOf(topLevelTarget) >= 0) {
        //visible top-level node is selected - add all nesteds starting from bottom up
        let target = edge.target;
        while (target.parent !== undefined) {
          if (result.indexOf(target) < 0) {
            result.push(target);
          }
          target = target.parent;
        }
      }

      if (result.indexOf(topLevelSource) >= 0) {
        //visible top-level node is selected - add all nesteds starting from bottom up
        let source = edge.source;
        while (source.parent !== undefined) {
          if (result.indexOf(source) < 0) {
            result.push(source);
          }
          source = source.parent;
        }
      }
    } //end of edges loop

    return result;
  };

  // ======= Miscellaneous functions

  this.clearGraph = function () {
    this.stopLayout();
    this.nodes = [];
    this.edges = [];
    this.undoLog = [];
    this.redoLog = [];
    this.nodesMap = {};
    this.edgesMap = {};
    this.blocklistedNodes = [];
    this.selectedNodes = [];
    this.lastResponse = null;
  };

  this.arrRemoveAll = function remove(arr, items) {
    for (let i = items.length; i--; ) {
      self.arrRemove(arr, items[i]);
    }
  };

  this.arrRemove = function remove(arr, item) {
    for (let i = arr.length; i--; ) {
      if (arr[i] === item) {
        arr.splice(i, 1);
      }
    }
  };

  this.getNeighbours = function (node) {
    const neighbourNodes = [];
    self.edges.forEach((edge) => {
      if (edge.topSrc === edge.topTarget) {
        return;
      }
      if (edge.topSrc === node) {
        if (neighbourNodes.indexOf(edge.topTarget) < 0) {
          neighbourNodes.push(edge.topTarget);
        }
      }
      if (edge.topTarget === node) {
        if (neighbourNodes.indexOf(edge.topSrc) < 0) {
          neighbourNodes.push(edge.topSrc);
        }
      }
    });
    return neighbourNodes;
  };

  //Creates a query that represents a node - either simple term query or boolean if grouped
  this.buildNodeQuery = function (topLevelNode) {
    let containedNodes = [topLevelNode];
    containedNodes = self.returnUnpackedGroupeds(containedNodes);
    if (containedNodes.length === 1) {
      //Simple case - return a single-term query
      const tq = {};
      tq[topLevelNode.data.field] = topLevelNode.data.term;
      return {
        term: tq,
      };
    }
    const termsByField = {};
    containedNodes.forEach((node) => {
      let termsList = termsByField[node.data.field];
      if (!termsList) {
        termsList = [];
        termsByField[node.data.field] = termsList;
      }
      termsList.push(node.data.term);
    });
    //Single field case
    if (Object.keys(termsByField).length === 1) {
      return {
        terms: termsByField,
      };
    }
    //Multi-field case - build a bool query with per-field terms clauses.
    const q = {
      bool: {
        should: [],
      },
    };
    for (const field in termsByField) {
      if (termsByField.hasOwnProperty(field)) {
        const tq = {};
        tq[field] = termsByField[field];
        q.bool.should.push({
          terms: tq,
        });
      }
    }
    return q;
  };

  //====== Layout functions ========

  this.stopLayout = function () {
    if (this.force) {
      this.force.stop();
    }
    this.force = null;
  };

  this.runLayout = function () {
    this.stopLayout();
    // The set of nodes and edges we present to the d3 layout algorithms
    // is potentially a reduced set of nodes if the client has used any
    // grouping of nodes into parent nodes.
    const effectiveEdges = [];
    self.edges.forEach((edge) => {
      let topSrc = edge.source;
      let topTarget = edge.target;
      while (topSrc.parent !== undefined) {
        topSrc = topSrc.parent;
      }
      while (topTarget.parent !== undefined) {
        topTarget = topTarget.parent;
      }
      edge.topSrc = topSrc;
      edge.topTarget = topTarget;

      if (topSrc !== topTarget) {
        effectiveEdges.push({
          source: topSrc,
          target: topTarget,
        });
      }
    });
    const visibleNodes = self.nodes.filter(function (n) {
      return n.parent === undefined;
    });
    //reset then roll-up all the counts
    const allNodes = self.nodes;
    allNodes.forEach((node) => {
      node.numChildren = 0;
    });

    for (const n in allNodes) {
      if (!allNodes.hasOwnProperty(n)) {
        continue;
      }
      let node = allNodes[n];
      while (node.parent !== undefined) {
        node = node.parent;
        node.numChildren = node.numChildren + 1;
      }
    }
    this.force = d3.layout
      .force()
      .nodes(visibleNodes)
      .links(effectiveEdges)
      .friction(0.8)
      .linkDistance(100)
      .charge(-1500)
      .gravity(0.15)
      .theta(0.99)
      .alpha(0.5)
      .size([800, 600])
      .on('tick', function () {
        const nodeArray = self.nodes;
        let hasRollups = false;
        //Update the position of all "top level nodes"
        nodeArray.forEach((n) => {
          //Code to support roll-ups
          if (n.parent === undefined) {
            n.kx = n.x;
            n.ky = n.y;
          } else {
            hasRollups = true;
          }
        });
        if (hasRollups) {
          nodeArray.forEach((n) => {
            //Code to support roll-ups
            if (n.parent !== undefined) {
              // Is a grouped node - inherit parent's position so edges point into parent
              // d3 thinks it has moved it to x and y but we have final say using kx and ky.
              let topLevelNode = n.parent;
              while (topLevelNode.parent !== undefined) {
                topLevelNode = topLevelNode.parent;
              }

              n.kx = topLevelNode.x;
              n.ky = topLevelNode.y;
            }
          });
        }
        if (self.changeHandler) {
          // Hook to allow any client to respond to position changes
          // e.g. angular adjusts and repaints node positions on screen.
          self.changeHandler();
        }
      });
    this.force.start();
  };

  //========Grouping functions==========

  //Merges all selected nodes into node
  this.groupSelections = function (node) {
    const ops = [];
    self.nodes.forEach(function (otherNode) {
      if (otherNode !== node && otherNode.isSelected && otherNode.parent === undefined) {
        otherNode.parent = node;
        otherNode.isSelected = false;
        self.arrRemove(self.selectedNodes, otherNode);
        ops.push(new GroupOperation(node, otherNode));
      }
    });
    self.selectNone();
    self.selectNode(node);
    self.addUndoLogEntry(ops);
    self.runLayout();
  };

  this.mergeNeighbours = function (node) {
    const neighbours = self.getNeighbours(node);
    const ops = [];
    neighbours.forEach(function (otherNode) {
      if (otherNode !== node && otherNode.parent === undefined) {
        otherNode.parent = node;
        otherNode.isSelected = false;
        self.arrRemove(self.selectedNodes, otherNode);
        ops.push(new GroupOperation(node, otherNode));
      }
    });
    self.addUndoLogEntry(ops);
    self.runLayout();
  };

  this.mergeSelections = function (targetNode) {
    if (!targetNode) {
      console.log('Error - merge called on undefined target');
      return;
    }
    const selClone = self.selectedNodes.slice();
    const ops = [];
    selClone.forEach(function (otherNode) {
      if (otherNode !== targetNode && otherNode.parent === undefined) {
        otherNode.parent = targetNode;
        otherNode.isSelected = false;
        self.arrRemove(self.selectedNodes, otherNode);
        ops.push(new GroupOperation(targetNode, otherNode));
      }
    });
    self.addUndoLogEntry(ops);
    self.runLayout();
  };

  this.ungroup = function (node) {
    const ops = [];
    self.nodes.forEach(function (other) {
      if (other.parent === node) {
        other.parent = undefined;
        ops.push(new UnGroupOperation(node, other));
      }
    });
    self.addUndoLogEntry(ops);
    self.runLayout();
  };

  this.unblocklist = function (node) {
    self.arrRemove(self.blocklistedNodes, node);
  };

  this.blocklistSelection = function () {
    const selection = self.getAllSelectedNodes();
    const danglingEdges = [];
    self.edges.forEach(function (edge) {
      if (selection.indexOf(edge.source) >= 0 || selection.indexOf(edge.target) >= 0) {
        delete self.edgesMap[edge.id];
        danglingEdges.push(edge);
      }
    });
    selection.forEach((node) => {
      delete self.nodesMap[node.id];
      self.blocklistedNodes.push(node);
      node.isSelected = false;
    });
    self.arrRemoveAll(self.nodes, selection);
    self.arrRemoveAll(self.edges, danglingEdges);
    self.selectedNodes = [];
    self.runLayout();
  };

  // A "simple search" operation that requires no parameters from the client.
  // Performs numHops hops pulling in field-specific number of terms each time
  this.simpleSearch = function (searchTerm, fieldsChoice, numHops) {
    const qs = {
      query_string: {
        query: searchTerm,
      },
    };
    return this.search(qs, fieldsChoice, numHops);
  };

  this.search = function (query, fieldsChoice, numHops) {
    if (!fieldsChoice) {
      fieldsChoice = self.options.vertex_fields;
    }
    let step = {};

    //Add any blocklisted nodes to exclusion list
    const excludeNodesByField = {};
    const nots = [];
    const avoidNodes = this.blocklistedNodes;
    for (let i = 0; i < avoidNodes.length; i++) {
      const n = avoidNodes[i];
      let arr = excludeNodesByField[n.data.field];
      if (!arr) {
        arr = [];
        excludeNodesByField[n.data.field] = arr;
      }
      arr.push(n.data.term);
      //Add to list of must_nots in guiding query
      const tq = {};
      tq[n.data.field] = n.data.term;
      nots.push({
        term: tq,
      });
    }

    const rootStep = step;
    for (let hopNum = 0; hopNum < numHops; hopNum++) {
      const arr = [];

      fieldsChoice.forEach(({ name: field, hopSize }) => {
        const excludes = excludeNodesByField[field];
        const stepField = {
          field: field,
          size: hopSize,
          min_doc_count: parseInt(self.options.exploreControls.minDocCount),
        };
        if (excludes) {
          stepField.exclude = excludes;
        }
        arr.push(stepField);
      });
      step.vertices = arr;
      if (hopNum < numHops - 1) {
        // if (s < (stepSizes.length - 1)) {
        const nextStep = {};
        step.connections = nextStep;
        step = nextStep;
      }
    }

    if (nots.length > 0) {
      query = {
        bool: {
          must: [query],
          must_not: nots,
        },
      };
    }

    const request = {
      query: query,
      controls: self.buildControls(),
      connections: rootStep.connections,
      vertices: rootStep.vertices,
    };
    self.callElasticsearch(request);
  };

  this.buildControls = function () {
    //This is an object managed by the client that may be subject to change
    const guiSettingsObj = self.options.exploreControls;

    const controls = {
      use_significance: guiSettingsObj.useSignificance,
      sample_size: guiSettingsObj.sampleSize,
      timeout: parseInt(guiSettingsObj.timeoutMillis),
    };
    // console.log("guiSettingsObj",guiSettingsObj);
    if (guiSettingsObj.sampleDiversityField != null) {
      controls.sample_diversity = {
        field: guiSettingsObj.sampleDiversityField.name,
        max_docs_per_value: guiSettingsObj.maxValuesPerDoc,
      };
    }
    return controls;
  };

  this.makeNodeId = function (field, term) {
    return field + '..' + term;
  };

  this.makeEdgeId = function (srcId, targetId) {
    let id = srcId + '->' + targetId;
    if (srcId > targetId) {
      id = targetId + '->' + srcId;
    }
    return id;
  };

  //=======  Adds new nodes retrieved from an elasticsearch search ========
  this.mergeGraph = function (newData) {
    this.stopLayout();

    if (!newData.nodes) {
      newData.nodes = [];
    }
    const lastOps = [];

    // === Commented out - not sure it was obvious to users what various circle sizes meant
    // var minCircleSize = 5;
    // var maxCircleSize = 25;
    // var sizeScale = d3.scale.pow().exponent(0.15)
    //   .domain([0, d3.max(newData.nodes, function(d) {
    //     return d.weight;
    //   })])
    //   .range([minCircleSize, maxCircleSize]);

    //Remove nodes we already have
    const dedupedNodes = [];
    newData.nodes.forEach((node) => {
      //Assign an ID
      node.id = self.makeNodeId(node.field, node.term);
      if (!this.nodesMap[node.id]) {
        //Default the label
        if (!node.label) {
          node.label = node.term;
        }
        dedupedNodes.push(node);
      }
    });
    if (dedupedNodes.length > 0 && this.options.nodeLabeller) {
      // A hook for client code to attach labels etc to newly introduced nodes.
      this.options.nodeLabeller(dedupedNodes);
    }

    dedupedNodes.forEach((dedupedNode) => {
      let label = dedupedNode.term;
      if (dedupedNode.label) {
        label = dedupedNode.label;
      }

      const node = {
        x: 1,
        y: 1,
        numChildren: 0,
        parent: undefined,
        isSelected: false,
        id: dedupedNode.id,
        label: label,
        color: dedupedNode.color,
        icon: dedupedNode.icon,
        data: dedupedNode,
      };
      //        node.scaledSize = sizeScale(node.data.weight);
      node.scaledSize = 15;
      node.seqNumber = this.seqNumber++;
      this.nodes.push(node);
      lastOps.push(new AddNodeOperation(node, self));
      this.nodesMap[node.id] = node;
    });

    newData.edges.forEach((edge) => {
      const src = newData.nodes[edge.source];
      const target = newData.nodes[edge.target];
      edge.id = this.makeEdgeId(src.id, target.id);

      //Lookup the wrappers object that will hold display Info like x/y coordinates
      const srcWrapperObj = this.nodesMap[src.id];
      const targetWrapperObj = this.nodesMap[target.id];

      const existingEdge = this.edgesMap[edge.id];
      if (existingEdge) {
        existingEdge.weight = Math.max(existingEdge.weight, edge.weight);
        //TODO update width too?
        existingEdge.doc_count = Math.max(existingEdge.doc_count, edge.doc_count);
        return;
      }
      const newEdge = {
        source: srcWrapperObj,
        target: targetWrapperObj,
        weight: edge.weight,
        width: edge.width,
        id: edge.id,
        doc_count: edge.doc_count,
      };
      if (edge.label) {
        newEdge.label = edge.label;
      }

      this.edgesMap[newEdge.id] = newEdge;
      this.edges.push(newEdge);
      lastOps.push(new AddEdgeOperation(newEdge, self));
    });

    if (lastOps.length > 0) {
      self.addUndoLogEntry(lastOps);
    }

    this.runLayout();
  };

  this.mergeIds = function (parentId, childId) {
    const parent = self.getNode(parentId);
    const child = self.getNode(childId);
    if (child.isSelected) {
      child.isSelected = false;
      self.arrRemove(self.selectedNodes, child);
    }
    child.parent = parent;
    self.addUndoLogEntry([new GroupOperation(parent, child)]);
    self.runLayout();
  };

  this.getNode = function (nodeId) {
    return this.nodesMap[nodeId];
  };
  this.getEdge = function (edgeId) {
    return this.edgesMap[edgeId];
  };

  //======= Expand functions to request new additions to the graph

  this.expandSelecteds = function (targetOptions = {}) {
    let startNodes = self.getAllSelectedNodes();
    if (startNodes.length === 0) {
      startNodes = self.nodes;
    }
    const clone = startNodes.slice();
    self.expand(clone, targetOptions);
  };

  this.expandGraph = function () {
    self.expandSelecteds();
  };

  //Find new nodes to link to existing selected nodes
  this.expandNode = function (node) {
    self.expand(self.returnUnpackedGroupeds([node]), {});
  };

  // A manual expand function where the client provides the list
  // of existing nodes that are the start points and some options
  // about what targets are of interest.
  this.expand = function (startNodes, targetOptions) {
    //=============================
    const nodesByField = {};
    const excludeNodesByField = {};

    //Add any blocklisted nodes to exclusion list
    const avoidNodes = this.blocklistedNodes;
    for (let i = 0; i < avoidNodes.length; i++) {
      const n = avoidNodes[i];
      let arr = excludeNodesByField[n.data.field];
      if (!arr) {
        arr = [];
        excludeNodesByField[n.data.field] = arr;
      }
      if (arr.indexOf(n.data.term) < 0) {
        arr.push(n.data.term);
      }
    }

    const allExistingNodes = this.nodes;
    for (let i = 0; i < allExistingNodes.length; i++) {
      const n = allExistingNodes[i];
      let arr = excludeNodesByField[n.data.field];
      if (!arr) {
        arr = [];
        excludeNodesByField[n.data.field] = arr;
      }
      arr.push(n.data.term);
    }

    //Organize nodes by field
    for (let i = 0; i < startNodes.length; i++) {
      const n = startNodes[i];
      let arr = nodesByField[n.data.field];
      if (!arr) {
        arr = [];
        nodesByField[n.data.field] = arr;
      }
      // pushing boosts server-side to influence sampling/direction
      arr.push({
        term: n.data.term,
        boost: n.data.weight,
      });

      arr = excludeNodesByField[n.data.field];
      if (!arr) {
        arr = [];
        excludeNodesByField[n.data.field] = arr;
      }
      //NOTE for the entity-building use case need to remove excludes that otherwise
      // prevent bridge-building.
      if (arr.indexOf(n.data.term) < 0) {
        arr.push(n.data.term);
      }
    }

    const primaryVertices = [];
    const secondaryVertices = [];
    for (const fieldName in nodesByField) {
      if (nodesByField.hasOwnProperty(fieldName)) {
        primaryVertices.push({
          field: fieldName,
          include: nodesByField[fieldName],
          min_doc_count: parseInt(self.options.exploreControls.minDocCount),
        });
      }
    }

    let targetFields = this.options.vertex_fields;
    if (targetOptions.toFields) {
      targetFields = targetOptions.toFields;
    }

    //Identify target fields
    targetFields.forEach((targetField) => {
      const fieldName = targetField.name;
      // Sometimes the target field is disabled from loading new hops so we need to use the last valid figure
      const hopSize = targetField.hopSize > 0 ? targetField.hopSize : targetField.lastValidHopSize;

      const fieldHop = {
        field: fieldName,
        size: hopSize,
        min_doc_count: parseInt(self.options.exploreControls.minDocCount),
      };
      fieldHop.exclude = excludeNodesByField[fieldName];
      secondaryVertices.push(fieldHop);
    });

    const request = {
      controls: self.buildControls(),
      vertices: primaryVertices,
      connections: {
        vertices: secondaryVertices,
      },
    };
    self.lastRequest = JSON.stringify(request, null, '\t');
    graphExplorer(self.options.indexName, request, function (data) {
      self.lastResponse = JSON.stringify(data, null, '\t');
      const edges = [];

      //Label fields with a field number for CSS styling
      data.vertices.forEach((node) => {
        targetFields.some((fieldDef) => {
          if (node.field === fieldDef.name) {
            node.color = fieldDef.color;
            node.icon = fieldDef.icon;
            node.fieldDef = fieldDef;
            return true;
          }
          return false;
        });
      });

      // Size the edges based on the maximum weight
      const minLineSize = 2;
      const maxLineSize = 10;
      let maxEdgeWeight = 0.00000001;
      data.connections.forEach((edge) => {
        maxEdgeWeight = Math.max(maxEdgeWeight, edge.weight);
        edges.push({
          source: edge.source,
          target: edge.target,
          doc_count: edge.doc_count,
          weight: edge.weight,
          width: Math.max(minLineSize, (edge.weight / maxEdgeWeight) * maxLineSize),
        });
      });

      // Add the new nodes and edges into the existing workspace's graph
      self.mergeGraph({
        nodes: data.vertices,
        edges: edges,
      });
    });
    //===== End expand graph ========================
  };

  this.trimExcessNewEdges = function (newNodes, newEdges) {
    let trimmedEdges = [];
    const maxNumEdgesToReturn = 5;
    //Trim here to just the new edges that are most interesting.
    newEdges.forEach((edge) => {
      const src = newNodes[edge.source];
      const target = newNodes[edge.target];
      const srcId = src.field + '..' + src.term;
      const targetId = target.field + '..' + target.term;
      const id = this.makeEdgeId(srcId, targetId);
      const existingSrcNode = self.nodesMap[srcId];
      const existingTargetNode = self.nodesMap[targetId];
      if (existingSrcNode != null && existingTargetNode != null) {
        if (existingSrcNode.parent !== undefined && existingTargetNode.parent !== undefined) {
          // both nodes are rolled-up and grouped so this edge would not be a visible
          // change to the graph - lose it in favour of any other visible ones.
          return;
        }
      } else {
        console.log('Error? Missing nodes ' + srcId + ' or ' + targetId, self.nodesMap);
        return;
      }

      const existingEdge = self.edgesMap[id];
      if (existingEdge) {
        existingEdge.weight = Math.max(existingEdge.weight, edge.weight);
        existingEdge.doc_count = Math.max(existingEdge.doc_count, edge.doc_count);
        return;
      } else {
        trimmedEdges.push(edge);
      }
    });
    if (trimmedEdges.length > maxNumEdgesToReturn) {
      //trim to only the most interesting ones
      trimmedEdges.sort(function (a, b) {
        return b.weight - a.weight;
      });
      trimmedEdges = trimmedEdges.splice(0, maxNumEdgesToReturn);
    }
    return trimmedEdges;
  };

  this.getQuery = function (startNodes, loose) {
    const shoulds = [];
    let nodes = startNodes;
    if (!startNodes) {
      nodes = self.nodes;
    }
    nodes.forEach((node) => {
      if (node.parent === undefined) {
        shoulds.push(self.buildNodeQuery(node));
      }
    });
    return {
      bool: {
        should: shoulds,
        minimum_should_match: Math.min(shoulds.length, loose ? 1 : 2),
      },
    };
  };

  this.getSelectedOrAllNodes = function () {
    let startNodes = self.getAllSelectedNodes();
    if (startNodes.length === 0) {
      startNodes = self.nodes;
    }
    return startNodes;
  };

  this.getSelectedOrAllTopNodes = function () {
    return self.getSelectedOrAllNodes().filter(function (node) {
      return node.parent === undefined;
    });
  };

  function addTermToFieldList(map, field, term) {
    let arr = map[field];
    if (!arr) {
      arr = [];
      map[field] = arr;
    }
    arr.push(term);
  }

  /**
   * Add missing links between existing nodes
   * @param maxNewEdges Max number of new edges added. Avoid adding too many new edges
   * at once into the graph otherwise disorientating
   */
  this.fillInGraph = function (maxNewEdges = 10) {
    let nodesForLinking = self.getSelectedOrAllTopNodes();

    const maxNumVerticesSearchable = 100;

    // Server limitation - we can only search for connections between max 100 vertices at a time.
    if (nodesForLinking.length > maxNumVerticesSearchable) {
      //Make a selection of random nodes from the array. Shift the random choices
      // to the front of the array.
      for (let i = 0; i < maxNumVerticesSearchable; i++) {
        const oldNode = nodesForLinking[i];
        const randomIndex = Math.floor(Math.random() * (nodesForLinking.length - i)) + i;
        //Swap the node positions of the randomly selected node and i
        nodesForLinking[i] = nodesForLinking[randomIndex];
        nodesForLinking[randomIndex] = oldNode;
      }
      // Trim to our random selection
      nodesForLinking = nodesForLinking.slice(0, maxNumVerticesSearchable - 1);
    }

    // Create our query/aggregation request using the selected nodes.
    // Filters are named after the index of the node in the nodesForLinking
    // array. The result bucket describing the relationship between
    // the first 2 nodes in the array will therefore be labelled "0|1"
    const shoulds = [];
    const filterMap = {};
    nodesForLinking.forEach(function (node, nodeNum) {
      const nodeQuery = self.buildNodeQuery(node);
      shoulds.push(nodeQuery);
      filterMap[nodeNum] = nodeQuery;
    });
    const searchReq = {
      size: 0,
      query: {
        bool: {
          // Only match docs that share 2 nodes so can help describe their relationship
          minimum_should_match: 2,
          should: shoulds,
        },
      },
      aggs: {
        matrix: {
          adjacency_matrix: {
            separator: '|',
            filters: filterMap,
          },
        },
      },
    };

    // Search for connections between the selected nodes.
    searcher(self.options.indexName, searchReq, function (data) {
      const numDocsMatched = data.hits.total;
      const buckets = data.aggregations.matrix.buckets;
      const vertices = nodesForLinking.map(function (existingNode) {
        return {
          field: existingNode.data.field,
          term: existingNode.data.term,
          weight: 1,
          depth: 0,
        };
      });

      let connections = [];
      let maxEdgeWeight = 0;
      // Turn matrix array of results into a map
      const keyedBuckets = {};
      buckets.forEach(function (bucket) {
        keyedBuckets[bucket.key] = bucket;
      });

      buckets.forEach(function (bucket) {
        // We calibrate line thickness based on % of max weight of
        // all edges (including the edges we may already have in the workspace)
        const ids = bucket.key.split('|');
        if (ids.length === 2) {
          // bucket represents an edge
          if (self.options.exploreControls.useSignificance) {
            const t1 = keyedBuckets[ids[0]].doc_count;
            const t2 = keyedBuckets[ids[1]].doc_count;
            const t1AndT2 = bucket.doc_count;
            // Calc the significant_terms score to prioritize selection of interesting links
            bucket.weight = self.jLHScore(
              t1AndT2,
              Math.max(t1, t2),
              Math.min(t1, t2),
              numDocsMatched
            );
          } else {
            // prioritize links purely on volume of intersecting docs
            bucket.weight = bucket.doc_count;
          }
          maxEdgeWeight = Math.max(maxEdgeWeight, bucket.weight);
        }
      });
      const backFilledMinLineSize = 2;
      const backFilledMaxLineSize = 5;
      buckets.forEach(function (bucket) {
        if (bucket.doc_count < parseInt(self.options.exploreControls.minDocCount)) {
          return;
        }
        const ids = bucket.key.split('|');
        if (ids.length === 2) {
          // Bucket represents an edge
          const srcNode = nodesForLinking[ids[0]];
          const targetNode = nodesForLinking[ids[1]];
          const edgeId = self.makeEdgeId(srcNode.id, targetNode.id);
          const existingEdge = self.edgesMap[edgeId];
          if (existingEdge) {
            // Tweak the doc_count score having just looked it up.
            existingEdge.doc_count = Math.max(existingEdge.doc_count, bucket.doc_count);
          } else {
            connections.push({
              // source and target values are indexes into the vertices array
              source: parseInt(ids[0]),
              target: parseInt(ids[1]),
              weight: bucket.weight,
              width: Math.max(
                backFilledMinLineSize,
                (bucket.weight / maxEdgeWeight) * backFilledMaxLineSize
              ),
              doc_count: bucket.doc_count,
            });
          }
        }
      });
      // Trim the array of connections so that we don't add too many at once - disorientating for users otherwise
      if (connections.length > maxNewEdges) {
        connections = connections.sort(function (a, b) {
          return b.weight - a.weight;
        });
        connections = connections.slice(0, maxNewEdges);
      }

      // Merge the new edges into the existing workspace's graph.
      // We reuse the mergeGraph function used to handle the
      // results of other calls to the server-side Graph API
      // so must package the results here with that same format
      // even though we know all the vertices we provide will
      // be duplicates and ignored.
      self.mergeGraph({
        nodes: vertices,
        edges: connections,
      });
    });
  };

  // Provide a "fuzzy find similar" query that can find similar docs but preferably
  // not re-iterating the exact terms we already have in the workspace.
  // We use a free-text search on the index's configured default field (typically '_all')
  // to drill-down into docs that should be linked but aren't via the exact terms
  // we have in the workspace
  this.getLikeThisButNotThisQuery = function (startNodes) {
    const likeQueries = [];

    const txtsByFieldType = {};
    startNodes.forEach((node) => {
      let txt = txtsByFieldType[node.data.field];
      if (txt) {
        txt = txt + ' ' + node.label;
      } else {
        txt = node.label;
      }
      txtsByFieldType[node.data.field] = txt;
    });
    for (const field in txtsByFieldType) {
      if (txtsByFieldType.hasOwnProperty(field)) {
        likeQueries.push({
          more_like_this: {
            like: txtsByFieldType[field],
            min_term_freq: 1,
            minimum_should_match: '20%',
            min_doc_freq: 1,
            boost_terms: 2,
            max_query_terms: 25,
          },
        });
      }
    }

    const excludeNodesByField = {};
    const allExistingNodes = self.nodes;
    allExistingNodes.forEach((existingNode) => {
      addTermToFieldList(excludeNodesByField, existingNode.data.field, existingNode.data.term);
    });
    const blocklistedNodes = self.blocklistedNodes;
    blocklistedNodes.forEach((blocklistedNode) => {
      addTermToFieldList(
        excludeNodesByField,
        blocklistedNode.data.field,
        blocklistedNode.data.term
      );
    });

    //Create negative boosting queries to avoid matching what you already have in the workspace.
    const notExistingNodes = [];
    Object.keys(excludeNodesByField).forEach((fieldName) => {
      const termsQuery = {};
      termsQuery[fieldName] = excludeNodesByField[fieldName];
      notExistingNodes.push({
        terms: termsQuery,
      });
    });

    const result = {
      // Use a boosting query to effectively to request "similar to these IDS/labels but
      // preferably not containing these exact IDs".
      boosting: {
        negative_boost: 0.0001,
        negative: {
          bool: {
            should: notExistingNodes,
          },
        },
        positive: {
          bool: {
            should: likeQueries,
          },
        },
      },
    };
    return result;
  };

  this.getSelectedIntersections = function (callback) {
    if (self.selectedNodes.length === 0) {
      return self.getAllIntersections(callback, self.nodes);
    }
    if (self.selectedNodes.length === 1) {
      const selectedNode = self.selectedNodes[0];
      const neighbourNodes = self.getNeighbours(selectedNode);
      neighbourNodes.push(selectedNode);
      return self.getAllIntersections(callback, neighbourNodes);
    }
    return self.getAllIntersections(callback, self.getAllSelectedNodes());
  };

  this.jLHScore = function (subsetFreq, subsetSize, supersetFreq, supersetSize) {
    const subsetProbability = subsetFreq / subsetSize;
    const supersetProbability = supersetFreq / supersetSize;

    const absoluteProbabilityChange = subsetProbability - supersetProbability;
    if (absoluteProbabilityChange <= 0) {
      return 0;
    }
    const relativeProbabilityChange = subsetProbability / supersetProbability;
    return absoluteProbabilityChange * relativeProbabilityChange;
  };

  // Currently unused in the Kibana UI. It was a utility that provided a sorted list
  // of recommended node merges for a selection of nodes. Top results would be
  // rare nodes that ALWAYS appear alongside more popular ones e.g. text:9200 always
  // appears alongside hashtag:elasticsearch so would be offered as a likely candidate
  // for merging.

  // Determines union/intersection stats for neighbours of a node.
  // TODO - could move server-side as a graph API function?
  this.getAllIntersections = function (callback, nodes) {
    //Ensure these are all top-level nodes only
    nodes = nodes.filter(function (n) {
      return n.parent === undefined;
    });

    const allQueries = nodes.map(function (node) {
      return self.buildNodeQuery(node);
    });

    const allQuery = {
      bool: {
        should: allQueries,
      },
    };
    //====================
    const request = {
      query: allQuery,
      size: 0,
      aggs: {
        all: {
          global: {},
        },
        sources: {
          // Could use significant_terms not filters to get stats but
          // for the fact some of the nodes are groups of terms.
          filters: {
            filters: {},
          },
          aggs: {
            targets: {
              filters: {
                filters: {},
              },
            },
          },
        },
      },
    };
    allQueries.forEach((query, n) => {
      // Add aggs to get intersection stats with root node.
      request.aggs.sources.filters.filters['bg' + n] = query;
      request.aggs.sources.aggs.targets.filters.filters['fg' + n] = query;
    });
    searcher(self.options.indexName, request, function (data) {
      const termIntersects = [];
      const fullDocCounts = [];
      const allDocCount = data.aggregations.all.doc_count;

      // Gather the background stats for all nodes.
      nodes.forEach((rootNode, n) => {
        fullDocCounts.push(data.aggregations.sources.buckets['bg' + n].doc_count);
      });

      nodes.forEach((rootNode, n) => {
        const t1 = fullDocCounts[n];
        const baseAgg = data.aggregations.sources.buckets['bg' + n].targets.buckets;
        nodes.forEach((leafNode, l) => {
          const t2 = fullDocCounts[l];
          if (l === n) {
            return;
          }
          if (t1 > t2) {
            // We should get the same stats for t2->t1 from the t1->t2 bucket path
            return;
          }
          if (t1 === t2) {
            if (rootNode.id > leafNode.id) {
              // We should get the same stats for t2->t1 from the t1->t2 bucket path
              return;
            }
          }
          const t1AndT2 = baseAgg['fg' + l].doc_count;
          if (t1AndT2 === 0) {
            return;
          }
          const neighbourNode = nodes[l];
          let t1Label = rootNode.data.label;
          if (rootNode.numChildren > 0) {
            t1Label += '(+' + rootNode.numChildren + ')';
          }
          let t2Label = neighbourNode.data.label;
          if (neighbourNode.numChildren > 0) {
            t2Label += '(+' + neighbourNode.numChildren + ')';
          }

          // A straight percentage can be poor if t1==1 (100%) - not too much strength of evidence
          //  var mergeConfidence=t1AndT2/t1;

          // So using Significance heuristic instead
          const mergeConfidence = self.jLHScore(t1AndT2, t2, t1, allDocCount);

          const termIntersect = {
            id1: rootNode.id,
            id2: neighbourNode.id,
            term1: t1Label,
            term2: t2Label,
            v1: t1,
            v2: t2,
            mergeLeftConfidence: t1AndT2 / t1,
            mergeRightConfidence: t1AndT2 / t2,
            mergeConfidence: mergeConfidence,
            overlap: t1AndT2,
          };
          termIntersects.push(termIntersect);
        });
      });
      termIntersects.sort(function (a, b) {
        if (b.mergeConfidence !== a.mergeConfidence) {
          return b.mergeConfidence - a.mergeConfidence;
        }
        // If of equal similarity use the size of the overlap as
        // a measure of magnitude/significance for tie-breaker.

        if (b.overlap !== a.overlap) {
          return b.overlap - a.overlap;
        }
        //All other things being equal we now favour where t2 NOT t1 is small.
        return a.v2 - b.v2;
      });
      if (callback) {
        callback(termIntersects);
      }
    });
  };

  // Internal utility function for calling the Graph API and handling the response
  // by merging results into existing nodes in this workspace.
  this.callElasticsearch = function (request) {
    self.lastRequest = JSON.stringify(request, null, '\t');
    graphExplorer(self.options.indexName, request, function (data) {
      self.lastResponse = JSON.stringify(data, null, '\t');
      const edges = [];
      //Label the nodes with field number for CSS styling
      data.vertices.forEach((node) => {
        self.options.vertex_fields.some((fieldDef) => {
          if (node.field === fieldDef.name) {
            node.color = fieldDef.color;
            node.icon = fieldDef.icon;
            node.fieldDef = fieldDef;
            return true;
          }
          return false;
        });
      });

      //Size the edges depending on weight
      const minLineSize = 2;
      const maxLineSize = 10;
      let maxEdgeWeight = 0.00000001;
      data.connections.forEach((edge) => {
        maxEdgeWeight = Math.max(maxEdgeWeight, edge.weight);
      });
      data.connections.forEach((edge) => {
        edges.push({
          source: edge.source,
          target: edge.target,
          doc_count: edge.doc_count,
          weight: edge.weight,
          width: Math.max(minLineSize, (edge.weight / maxEdgeWeight) * maxLineSize),
        });
      });

      self.mergeGraph(
        {
          nodes: data.vertices,
          edges: edges,
        },
        {
          labeller: self.options.labeller,
        }
      );
    });
  };
}
//=====================

// Begin Kibana wrapper
export function createWorkspace(options) {
  return new GraphWorkspace(options);
}
