/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { DataPublicPluginSetup } from 'src/plugins/data/public';
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

// interface Data {
//   isLoading: boolean;
//   lastKnownData: unknown;
// }

export interface State {
  nodes: Record<string, Node>;
  loading: true | 'success' | 'failure';
}

export type NodeType = keyof typeof nodeRegistry;
export interface Node<T = unknown> {
  id: string;
  type: NodeType;
  state: T;
  inputNodes: string[];
  outputNode?: string;
}

export type Inputs = Record<string, unknown>;

export interface NodeDefinition<T = unknown> {
  initialize: () => T;
  renderReact: (props: RenderNode<T>) => React.ReactElement;

  validateInputs: (state: T, inputs: Inputs) => string[];
  run: (
    state: T,
    inputs: Inputs,
    deps: {
      data: DataPublicPluginStart;
      signal: AbortSignal;
    }
  ) => Promise<unknown>;
}

export type DispatchFn = (action: Action) => void;

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
  inputNodes: string[];
  outputNode?: string;
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

export type Action = SetNode | CreateNode | LoadingStart | LoadingSuccess | LoadingFailure;
