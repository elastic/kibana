/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { useState, useEffect, useRef, FC, useCallback } from 'react';
import { useDebounce } from 'react-use';

import { useKibana } from '../../../../../../src/plugins/kibana_react/public';
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
  const { services } = useKibana();
  const onError = services.canvas.notify.error;

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

    if (!firstRender) {
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

  useDebounce(() => handlers.current.resize({ height, width }), 150, [height, width]);

  useEffect(
    () => () => {
      handlers.current.destroy();
    },
    []
  );

  const render = useCallback(() => {
    renderFn(renderTarget.current!, config, handlers.current);
  }, [renderTarget, config, renderFn]);

  useEffect(() => {
    if (!domNode) {
      return;
    }

    if (!reuseNode || !renderTarget.current) {
      resetRenderTarget();
    }

    try {
      render();
      firstRender.current = false;
    } catch (err) {
      onError(err, { title: strings.getRenderErrorMessage(functionName) });
    }
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
