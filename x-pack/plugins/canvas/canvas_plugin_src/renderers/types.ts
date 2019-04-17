/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

type GenericCallback = (callback: () => void) => void;

export interface RendererHandlers {
  done: () => void;
  getFilter: () => string;
  onDestroy: GenericCallback;
  onResize: GenericCallback;
  setFilter: (filter: string) => void;
}

export interface RendererSpec<RendererConfig = {}> {
  name: string;
  displayName: string;
  help: string;
  reuseDomNode: boolean;
  height: number;
  render: (domNode: HTMLElement, config: RendererConfig, handlers: RendererHandlers) => void;
}

export type RendererFactory<RendererConfig = {}> = () => RendererSpec<RendererConfig>;
