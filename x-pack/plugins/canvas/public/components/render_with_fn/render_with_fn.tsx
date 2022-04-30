/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState, useEffect, useRef, FC, useCallback } from 'react';

import { isEqual } from 'lodash';

import { useNotifyService } from '../../services';
import { RenderToDom } from '../render_to_dom';
import { ErrorStrings } from '../../../i18n';
import { RendererHandlers } from '../../../types';

const { RenderWithFn: strings } = ErrorStrings;

interface Props {
  name: string;
  renderFn: (
    domNode: HTMLElement,
    config: Record<string, any>,
    handlers: RendererHandlers
  ) => void | Promise<void>;
  reuseNode: boolean;
  handlers: RendererHandlers;
  config: Record<string, any>;
  height: number;
  width: number;
}

const style = { height: '100%', width: '100%' };

export const RenderWithFn: FC<Props> = ({
  name: functionName,
  renderFn,
  reuseNode = false,
  handlers: incomingHandlers,
  config,
  width,
  height,
}) => {
  const { error: onError } = useNotifyService();

  const [domNode, setDomNode] = useState<HTMLElement | null>(null);

  // Tells us if the component is attempting to re-render into a previously-populated render target.
  const firstRender = useRef(true);
  // A reference to the node appended to the provided DOM node which is created and optionally replaced.
  const renderTarget = useRef<HTMLDivElement | null>(null);
  // A reference to the handlers, as the renderFn may mutate them, (via onXYZ functions)
  const handlers = useRef<RendererHandlers>(incomingHandlers);

  // Reset the render target, the node appended to the DOM node provided by RenderToDOM.
  const resetRenderTarget = useCallback(() => {
    if (!domNode) {
      return;
    }

    if (!firstRender.current) {
      handlers.current.destroy();
    }

    while (domNode.firstChild) {
      domNode.removeChild(domNode.firstChild);
    }

    const div = document.createElement('div');
    div.style.width = '100%';
    div.style.height = '100%';
    domNode.appendChild(div);

    renderTarget.current = div;
    firstRender.current = true;
  }, [domNode]);

  useEffect(() => handlers.current.resize({ height, width }), [height, width]);

  useEffect(
    () => () => {
      handlers.current.destroy();
    },
    []
  );

  const render = useCallback(async () => {
    if (!isEqual(handlers.current, incomingHandlers)) {
      handlers.current = incomingHandlers;
    }

    await renderFn(renderTarget.current!, config, handlers.current);
  }, [renderTarget, config, renderFn, incomingHandlers]);

  useEffect(() => {
    if (!domNode) {
      return;
    }

    if (!reuseNode || !renderTarget.current) {
      resetRenderTarget();
    }

    render()
      .then(() => {
        firstRender.current = false;
      })
      .catch((err) => {
        onError(err, { title: strings.getRenderErrorMessage(functionName) });
      });
  }, [domNode, functionName, onError, render, resetRenderTarget, reuseNode]);

  return (
    <div className="canvasWorkpad--element_render canvasRenderEl" style={style}>
      <RenderToDom
        style={style}
        render={(node: HTMLElement) => {
          setDomNode(node);
        }}
      />
    </div>
  );
};
