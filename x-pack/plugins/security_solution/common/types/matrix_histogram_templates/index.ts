/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export interface ElementPosition {
  /**
   * distance from the left edge of the page
   */
  left: number;
  /**
   * distance from the top edge of the page
   * */
  top: number;
  /**
   * width of the element
   */
  width: number;
  /**
   * height of the element
   */
  height: number;
  /**
   * angle of rotation
   */
  angle: number;
  /**
   * the id of the parent of this element part of a group
   */
  parent: string | null;
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

export interface CanvasPage {
  id: string;
  style: {
    background: string;
  };
  transition: {}; // Fix
  elements: CanvasElement[];
  groups: CanvasGroup[];
}

type CanvasTemplateElement = Omit<CanvasElement, 'filter' | 'type'>;
type CanvasTemplatePage = Omit<CanvasPage, 'elements'> & { elements: CanvasTemplateElement[] };

export interface CanvasVariable {
  name: string;
  value: boolean | number | string;
  type: 'boolean' | 'number' | 'string';
}

export interface CanvasAsset {
  '@created': string;
  id: string;
  type: 'dataurl';
  value: string;
}

export interface MatrixHistogramTemplates {
  '@created': string;
  '@timestamp': string;
  assets: { [id: string]: CanvasAsset };
  colors: string[];
  css: string;
  variables: CanvasVariable[];
  height: number;
  id: string;
  aliasId?: string;
  isWriteable: boolean;
  name: string;
  page: number;
  pages: CanvasPage[];
  width: number;
}

export interface SecuritySolutionTemplate {
  id: string;
  type: string;
  name: string;
  help: string;
  tags: string[];
  template_key: string;
  template?: Omit<MatrixHistogramTemplates, 'id' | 'isWriteable' | 'pages'> & {
    pages: CanvasTemplatePage[];
  };
}

export interface TemplateFindResponse {
  templates: SecuritySolutionTemplate[];
}
