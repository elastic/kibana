/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ElementFactory } from '../types';

type SpecPromiseFn<T extends any> = () => Promise<T[]>;
type AddToRegistry<T extends any> = (add: T[] | SpecPromiseFn<T>) => void;

export interface CanvasApi {
  addArgumentUIs: AddToRegistry<any>;
  addDatasourceUIs: AddToRegistry<any>;
  addElements: AddToRegistry<ElementFactory>;
  addModelUIs: AddToRegistry<any>;
  addTagUIs: AddToRegistry<any>;
  addTransformUIs: AddToRegistry<any>;
  addTransitions: AddToRegistry<any>;
  addViewUIs: AddToRegistry<any>;
}

export interface SetupRegistries extends Record<string, any[]> {
  elements: Array<ElementFactory | SpecPromiseFn<ElementFactory>>;
  transformUIs: any[];
  datasourceUIs: any[];
  modelUIs: any[];
  viewUIs: any[];
  argumentUIs: any[];
  tagUIs: any[];
  transitions: any[];
}

export function getPluginApi(): { api: CanvasApi; registries: SetupRegistries } {
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

  const addToRegistry = <T>(registry: Array<T | SpecPromiseFn<T>>) => {
    return (entries: T[] | SpecPromiseFn<T>) => {
      if (Array.isArray(entries)) {
        registry.push(...entries);
      } else {
        registry.push(entries);
      }
    };
  };

  const api: CanvasApi = {
    // All these others are local to canvas, and they will only register on start
    addElements: addToRegistry(registries.elements),
    addTransformUIs: addToRegistry(registries.transformUIs),
    addDatasourceUIs: addToRegistry(registries.datasourceUIs),
    addModelUIs: addToRegistry(registries.modelUIs),
    addViewUIs: addToRegistry(registries.viewUIs),
    addArgumentUIs: addToRegistry(registries.argumentUIs),
    addTagUIs: addToRegistry(registries.tagUIs),
    addTransitions: addToRegistry(registries.transitions),
  };

  return { api, registries };
}
