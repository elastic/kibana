/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { RefObject } from 'react';
// @ts-expect-error Unlinked Webpack Type
import ContainerStyle from 'types/interpreter';
import { SavedObject, SavedObjectAttributes } from 'src/core/public';

import { ElementPosition, CanvasPage, CanvasWorkpad, RendererSpec } from '../types';

/**
 * Represents a Canvas Element whose expression has been evaluated and now
 * exists in a transient, ready-to-render state.
 */
export interface CanvasRenderedElement {
  id: string;
  position: ElementPosition;
  expressionRenderable: CanvasRenderable;
}

/**
 * Represents a Page within a Canvas Workpad that is made up of ready-to-
 * render Elements.
 */
export interface CanvasRenderedPage extends Omit<Omit<CanvasPage, 'elements'>, 'groups'> {
  elements: CanvasRenderedElement[];
  groups: CanvasRenderedElement[][];
}

/**
 * A Canvas Workpad made up of ready-to-render Elements.
 */
export interface CanvasRenderedWorkpad extends Omit<CanvasWorkpad, 'pages'> {
  pages: CanvasRenderedPage[];
}

export type CanvasRenderedWorkpadSavedObject = SavedObject<
  CanvasRenderedWorkpad & SavedObjectAttributes
>;

/**
 * Represents the success/failure of the initial evaluation of a Canvas
 * Element, as well as the Function and CSS necessary to render the Element
 * upon a stage.
 */
export interface CanvasRenderable {
  error: string | null;
  state: 'ready' | 'error';
  value: {
    as: string;
    containerStyle: ContainerStyle;
    css: string;
    type: 'render';
    value: any;
  };
}

export interface CanvasShareableState {
  renderers: { [key: string]: RendererSpec };
  workpad: CanvasRenderedWorkpad | null;
  stage: Stage;
  footer: {
    isScrubberVisible: boolean;
  };
  settings: Settings;
  refs: Refs;
}

export interface Stage {
  page: number;
  height: number;
  width: number;
}

export interface Refs {
  stage: RefObject<HTMLDivElement>;
}

export interface Settings {
  autoplay: AutoplaySettings;
  toolbar: ToolbarSettings;
}

export interface AutoplaySettings {
  isEnabled: boolean;
  interval: string;
}

export interface ToolbarSettings {
  isAutohide: boolean;
}
