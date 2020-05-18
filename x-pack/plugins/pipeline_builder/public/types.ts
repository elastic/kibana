/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { IconType } from '@elastic/eui';
import { DataPublicPluginSetup } from 'src/plugins/data/public';
import { CoreStart } from 'kibana/public';
import { EmbeddableSetup, EmbeddableStart } from 'src/plugins/embeddable/public';
import { ExpressionsSetup, ExpressionsStart } from 'src/plugins/expressions/public';
import { VisualizationsSetup } from 'src/plugins/visualizations/public';
import { KibanaLegacySetup } from 'src/plugins/kibana_legacy/public';
import { NavigationPublicPluginStart } from '../../../../src/plugins/navigation/public';
import { DataPublicPluginStart } from '../../../../src/plugins/data/public';
import { nodeRegistry } from './nodes';

export interface PipelineAppDeps {
  navigation: NavigationPublicPluginStart;
  data: DataPublicPluginStart;
}

export interface PipelineSetupDependencies {
  kibanaLegacy: KibanaLegacySetup;
  expressions: ExpressionsSetup;
  data: DataPublicPluginSetup;
  embeddable?: EmbeddableSetup;
  visualizations: VisualizationsSetup;
}

export interface PipelineStartDependencies {
  data: DataPublicPluginStart;
  embeddable: EmbeddableStart;
  expressions: ExpressionsStart;
  navigation: NavigationPublicPluginStart;
}

export interface State {
  nodes: Record<string, Node>;
  rendererState: Record<string, unknown>;
  loading: false | 'success' | 'failure';
}

export type NodeType = keyof typeof nodeRegistry;
export interface Node<T = unknown> {
  id: string;
  type: NodeType;
  state: T;
  inputNodeIds: string[];
}

export type Inputs = Record<string, unknown>;

export interface NodeDefinition<T = unknown> {
  title: string;
  icon: IconType;

  initialize: () => T;
  renderReact: (props: RenderNode<T>) => React.ReactElement;

  inputNodeTypes: string[];
  outputType: 'json' | 'table' | 'scalar';

  run: (
    state: Node<T>,
    inputs: Inputs,
    inputNodeIds: string[],
    deps: {
      data: DataPublicPluginStart;
      http: CoreStart['http'];
      signal: AbortSignal;
    }
  ) => Promise<unknown>;
}

export type DispatchFn = (action: Action) => void;

export type DataType = 'number' | 'string' | 'date' | 'boolean' | 'other';
export interface PipelineColumn {
  id: string;
  label?: string;
  dataType?: DataType;
}
export interface PipelineTable {
  columns: PipelineColumn[];
  rows: Array<Record<string, unknown>>;
}

export interface RenderNode<T = unknown> {
  node: Node<T>;
  dispatch: DispatchFn;
}

interface SetNode {
  type: 'SET_NODE';
  nodeId: string;
  newState: unknown;
}

interface CreateNode {
  type: 'CREATE_NODE';
  nodeType: NodeType;
  inputNodeIds: string[];
}

interface DeleteNode {
  type: 'DELETE_NODE';
  nodeId: string;
}

interface LoadingStart {
  type: 'LOADING_START';
}
interface LoadingSuccess {
  type: 'LOADING_SUCCESS';
}
interface LoadingFailure {
  type: 'LOADING_FAILURE';
}

interface DeleteNodes {
  type: 'DELETE_NODES';
  nodeIds: string[];
}

interface SetRenderer {
  type: 'SET_RENDERER';
  newState: Record<string, unknown>;
}

export type Action =
  | SetNode
  | CreateNode
  | DeleteNode
  | LoadingStart
  | LoadingSuccess
  | LoadingFailure
  | DeleteNodes
  | SetRenderer;
