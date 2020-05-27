/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { IInterpreterRenderHandlers } from 'src/plugins/expressions';

type GenericRendererCallback = (callback: () => void) => void;

export interface RendererHandlers extends IInterpreterRenderHandlers {
  /** Handler to invoke when an element should be destroyed. */
  destroy: () => void;
  /** Get the id of the element being rendered.  Can be used as a unique ID in a render function */
  getElementId: () => string;
  /** Retrieves the value of the filter property on the element object persisted on the workpad */
  getFilter: () => string;
  /** Handler to invoke when a renderer is considered complete */
  onComplete: (fn: () => void) => void;
  /** Handler to invoke when a rendered embeddable is destroyed */
  onEmbeddableDestroyed: () => void;
  /** Handler to invoke when the input to a function has changed internally */
  onEmbeddableInputChange: (expression: string) => void;
  /** Handler to invoke when an element's dimensions have changed*/
  onResize: GenericRendererCallback;
  /** Handler to invoke when an element should be resized. */
  resize: (size: { height: number; width: number }) => void;
  /** Sets the value of the filter property on the element object persisted on the workpad */
  setFilter: (filter: string) => void;
}

export interface RendererSpec<RendererConfig = {}> {
  /** The render type */
  name: string;
  /** The name to display */
  displayName: string;
  /** A description of what is rendered */
  help: string;
  /** Indicate whether the element should reuse the existing DOM element when re-rendering */
  reuseDomNode: boolean;
  /** The default width of the element in pixels */
  width?: number;
  /** The default height of the element in pixels */
  height?: number;
  /** A function that renders an element into the specified DOM element */
  render: (domNode: HTMLElement, config: RendererConfig, handlers: RendererHandlers) => void;
}

export type RendererFactory<RendererConfig = {}> = () => RendererSpec<RendererConfig>;
