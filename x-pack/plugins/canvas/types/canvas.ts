/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ElementPosition } from './elements';

export interface CanvasAsset {
  '@created': string;
  id: string;
  type: 'dataurl';
  value: string;
}

export interface CanvasElement {
  id: string;
  position: ElementPosition;
  type: 'element';
  expression: string;
  filter: string;
}

export interface CanvasGroup {
  id: string;
  position: ElementPosition;
  expression?: string;
}

export interface CanvasPage {
  id: string;
  style: {
    background: string;
  };
  transition: {}; // Fix
  elements: CanvasElement[];
  groups: CanvasGroup[];
}

export interface CanvasVariable {
  name: string;
  value: boolean | number | string;
  type: 'boolean' | 'number' | 'string';
}

export interface CanvasWorkpad {
  '@created': string;
  '@timestamp': string;
  assets: { [id: string]: CanvasAsset };
  colors: string[];
  css: string;
  variables: CanvasVariable[];
  height: number;
  id: string;
  isWriteable: boolean;
  name: string;
  page: number;
  pages: CanvasPage[];
  width: number;
}

type CanvasTemplateElement = Omit<CanvasElement, 'filter' | 'type'>;
type CanvasTemplatePage = Omit<CanvasPage, 'elements'> & { elements: CanvasTemplateElement[] };
export interface CanvasTemplate {
  id: string;
  name: string;
  help: string;
  tags: string[];
  template_key: string;
  template?: Omit<CanvasWorkpad, 'id' | 'isWriteable' | 'pages'> & { pages: CanvasTemplatePage[] };
}

export interface CanvasWorkpadBoundingBox {
  left: number;
  right: number;
  top: number;
  bottom: number;
}

export type LayoutState = any;

export type CommitFn = (type: string, payload: any) => LayoutState;
