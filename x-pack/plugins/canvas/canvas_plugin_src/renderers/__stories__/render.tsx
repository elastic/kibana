/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { action } from '@storybook/addon-actions';
import React, { useRef, useEffect } from 'react';
import { RendererFactory, RendererHandlers } from '../../../types';

export const defaultHandlers: RendererHandlers = {
  destroy: () => action('destroy'),
  getElementId: () => 'element-id',
  getFilter: () => 'filter',
  getRenderMode: () => 'view',
  isSyncColorsEnabled: () => false,
  isInteractive: () => true,
  onComplete: (fn) => undefined,
  onEmbeddableDestroyed: action('onEmbeddableDestroyed'),
  onEmbeddableInputChange: action('onEmbeddableInputChange'),
  onResize: action('onResize'),
  resize: action('resize'),
  done: action('done'),
  onDestroy: action('onDestroy'),
  reload: action('reload'),
  update: action('update'),
  event: action('event'),
};

/*
  Uses a RenderDefinitionFactory and Config to render into an element.

  Intended to be used for stories for RenderDefinitionFactory
*/
interface RenderAdditionalProps {
  height?: string;
  width?: string;
  handlers?: RendererHandlers;
}

export const Render = <Renderer,>({
  renderer,
  config,
  ...rest
}: Renderer extends RendererFactory<infer Config>
  ? { renderer: Renderer; config: Config } & RenderAdditionalProps
  : { renderer: undefined; config: undefined } & RenderAdditionalProps) => {
  const { height, width, handlers } = {
    height: '200px',
    width: '200px',
    handlers: defaultHandlers,
    ...rest,
  };

  const containerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (renderer && containerRef.current !== null) {
      renderer().render(containerRef.current, config, handlers);
    }
  }, [renderer, config, handlers]);

  return (
    <div style={{ width, height }} ref={containerRef}>
      {' '}
    </div>
  );
};
