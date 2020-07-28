/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import {
  AnyExpressionFunctionDefinition,
  AnyExpressionTypeDefinition,
  RendererFactory,
} from '../types';
import { ElementFactory } from '../types';
import { ExpressionsSetup } from '../../../../src/plugins/expressions/public';

type AddToRegistry<T extends any> = (add: T[]) => void;

export interface CanvasApi {
  addArgumentUIs: AddToRegistry<any>;
  addDatasourceUIs: AddToRegistry<any>;
  addElements: AddToRegistry<ElementFactory>;
  addFunctions: AddToRegistry<() => AnyExpressionFunctionDefinition>;
  addModelUIs: AddToRegistry<any>;
  addRenderers: AddToRegistry<RendererFactory>;
  addTagUIs: AddToRegistry<any>;
  addTransformUIs: AddToRegistry<any>;
  addTransitions: AddToRegistry<any>;
  addTypes: AddToRegistry<() => AnyExpressionTypeDefinition>;
  addViewUIs: AddToRegistry<any>;
}

export interface SetupRegistries {
  elements: ElementFactory[];
  transformUIs: any[];
  datasourceUIs: any[];
  modelUIs: any[];
  viewUIs: any[];
  argumentUIs: any[];
  tagUIs: any[];
  transitions: any[];
}

export function getPluginApi(
  expressionsPluginSetup: ExpressionsSetup
): { api: CanvasApi; registries: SetupRegistries } {
  const registries: SetupRegistries = {
    elements: [],
    transformUIs: [],
    datasourceUIs: [],
    modelUIs: [],
    viewUIs: [],
    argumentUIs: [],
    tagUIs: [],
    transitions: [],
  };

  const api: CanvasApi = {
    // Functions, types and renderers are registered directly to expression plugin
    addFunctions: (fns) => {
      fns.forEach((fn) => {
        expressionsPluginSetup.registerFunction(fn);
      });
    },
    addTypes: (types) => {
      types.forEach((type) => {
        expressionsPluginSetup.registerType(type as any);
      });
    },
    addRenderers: (renderers) => {
      renderers.forEach((r: any) => {
        expressionsPluginSetup.registerRenderer(r);
      });
    },

    // All these others are local to canvas, and they will only register on start
    addElements: (elements) => registries.elements.push(...elements),
    addTransformUIs: (transforms) => registries.transformUIs.push(...transforms),
    addDatasourceUIs: (datasources) => registries.datasourceUIs.push(...datasources),
    addModelUIs: (models) => registries.modelUIs.push(...models),
    addViewUIs: (views) => registries.viewUIs.push(...views),
    addArgumentUIs: (args) => registries.argumentUIs.push(...args),
    addTagUIs: (tags) => registries.tagUIs.push(...tags),
    addTransitions: (transitions) => registries.transitions.push(...transitions),
  };

  return { api, registries };
}
