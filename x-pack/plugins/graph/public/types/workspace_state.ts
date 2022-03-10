/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { JsonObject } from '@kbn/utility-types';
import d3 from 'd3';
import { TargetOptions } from '../components/control_panel';
import { FontawesomeIcon } from '../helpers/style_choices';
import { WorkspaceField, AdvancedSettings } from './app_state';

export interface WorkspaceNode {
  id: string;
  x: number;
  y: number;
  label: string;
  icon: FontawesomeIcon;
  data: {
    field: string;
    term: string;
  };
  scaledSize: number;
  parent: WorkspaceNode | null;
  color: string;
  numChildren: number;
  isSelected?: boolean;
  kx: number;
  ky: number;
}

export type BlockListedNode = Omit<WorkspaceNode, 'numChildren' | 'kx' | 'ky' | 'id'>;

export interface WorkspaceEdge {
  weight: number;
  width: number;
  label: string;
  source: WorkspaceNode;
  target: WorkspaceNode;
  isSelected?: boolean;
  topTarget: WorkspaceNode;
  topSrc: WorkspaceNode;
}

export interface ServerResultNode {
  field: string;
  term: string;
  id: string;
  label: string;
  color: string;
  icon: FontawesomeIcon;
  data: {
    field: string;
    term: string;
  };
}

export interface ServerResultEdge {
  source: number;
  target: number;
  weight: number;
  width: number;
  doc_count?: number;
}

export interface GraphData {
  nodes: ServerResultNode[];
  edges: ServerResultEdge[];
}
export interface TermIntersect {
  id1: string;
  id2: string;
  term1: string;
  term2: string;
  v1: number;
  v2: number;
  overlap: number;
}

export interface Workspace {
  options: WorkspaceOptions;
  nodesMap: Record<string, WorkspaceNode>;
  nodes: WorkspaceNode[];
  selectedNodes: WorkspaceNode[];
  edges: WorkspaceEdge[];
  blocklistedNodes: BlockListedNode[];
  undoLog: string;
  redoLog: string;
  force: ReturnType<typeof d3.layout.force>;
  lastRequest: string;
  lastResponse: string;

  undo: () => void;
  redo: () => void;
  expandSelecteds: (targetOptions: TargetOptions) => {};
  deleteSelection: () => void;
  blocklistSelection: () => void;
  selectAll: () => void;
  selectNone: () => void;
  selectInvert: () => void;
  selectNeighbours: () => void;
  deselectNode: (node: WorkspaceNode) => void;
  colorSelected: (color: string) => void;
  groupSelections: (node: WorkspaceNode | undefined) => void;
  ungroup: (node: WorkspaceNode | undefined) => void;
  callElasticsearch: (request: any) => void;
  search: (qeury: any, fieldsChoice: WorkspaceField[] | undefined, numHops: number) => void;
  simpleSearch: (
    searchTerm: string,
    fieldsChoice: WorkspaceField[] | undefined,
    numHops: number
  ) => void;
  getAllIntersections: (
    callback: (termIntersects: TermIntersect[]) => void,
    nodes: WorkspaceNode[]
  ) => void;
  toggleNodeSelection: (node: WorkspaceNode) => boolean;
  mergeIds: (term1: string, term2: string) => void;
  changeHandler: () => void;
  unblockNode: (node: BlockListedNode) => void;
  unblockAll: () => void;
  clearGraph: () => void;

  getQuery(startNodes?: WorkspaceNode[], loose?: boolean): JsonObject;
  getSelectedOrAllNodes(): WorkspaceNode[];
  getLikeThisButNotThisQuery(startNodes?: WorkspaceNode[]): JsonObject;

  /**
   * Flatten grouped nodes and return a flat array of nodes
   * @param nodes List of nodes probably containing grouped nodes
   */
  returnUnpackedGroupeds(nodes: WorkspaceNode[]): WorkspaceNode[];

  /**
   * Adds new nodes retrieved from an elasticsearch search
   * @param newData
   */
  mergeGraph(newData: GraphData): void;

  /**
   * Fills in missing connections between the selected nodes.
   * @param connections The number of connections to fill in. Defaults to 10
   */
  fillInGraph(connections?: number): void;

  runLayout(): void;
  stopLayout(): void;

  addEdgeToSelection(edge: WorkspaceEdge): void;
  removeEdgeFromSelection(edge: WorkspaceEdge): void;
  clearEdgeSelection(): void;
  getEdgeSelection(): WorkspaceEdge[];
}

export type ExploreRequest = any;
export type SearchRequest = any;
export type ExploreResults = any;
export type SearchResults = any;
export type GraphExploreCallback = (data: ExploreResults) => void;
export type GraphSearchCallback = (data: SearchResults) => void;

export type WorkspaceOptions = Partial<{
  indexName: string;
  vertex_fields: WorkspaceField[];
  nodeLabeller: (newNodes: WorkspaceNode[]) => void;
  changeHandler: () => void;
  graphExploreProxy: (
    indexPattern: string,
    request: ExploreRequest,
    callback: GraphExploreCallback
  ) => void;
  searchProxy: (
    indexPattern: string,
    request: SearchRequest,
    callback: GraphSearchCallback
  ) => void;
  exploreControls: AdvancedSettings;
}>;

export type ControlType =
  | 'style'
  | 'drillDowns'
  | 'editLabel'
  | 'mergeTerms'
  | 'none'
  | 'edgeSelection';
