/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { useState, useEffect, useRef, FC } from 'react';
import { useKibana } from '../../../../../../src/plugins/kibana_react/public';
import { RenderToDom } from '../render_to_dom';
import { ErrorStrings } from '../../../i18n';
import { RendererHandlers } from '../../../types';
import { assignHandlers, createHandlers } from '../../lib/create_handlers';

const { RenderWithFn: strings } = ErrorStrings;

interface Props {
  name: string;
  renderFn: (
    domNode: HTMLElement,
    config: Record<string, any>,
    handlers: Partial<RendererHandlers>
  ) => void | Promise<void>;
  reuseNode: boolean;
  handlers: Partial<RendererHandlers>;
  config: Record<string, any>;
  size: {
    height: number;
    width: number;
  };
}

const style = { height: '100%', width: '100%' };

export const RenderWithFn: FC<Props> = ({
  name: functionName,
  renderFn,
  reuseNode = false,
  handlers: incomingHandlers,
  config,
  size,
}) => {
  const { services } = useKibana();
  const onError = services.canvas.notify.error;

  const [handlers, setHandlers] = useState(createHandlers());
  const [domNode, setDomNode] = useState<HTMLElement | null>(null);

  // Tells us if the component is attempting to re-render into a previously-populated render target.
  const firstRender = useRef(true);
  // A reference to the node appended to the provided DOM node which is created and optionally replaced.
  const renderTarget = useRef<HTMLDivElement | null>(null);

  // Reset the render target, the node appended to the DOM node provided by RenderToDOM.
  const resetRenderTarget = () => {
    if (!domNode) {
      return;
    }

    if (!firstRender) {
      handlers.destroy();
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
  };

  // Destroy the Element on unmount.
  useEffect(
    () => () => {
      handlers.destroy();
    },
    []
  );

  // Ensure all handlers are provided.
  useEffect(() => {
    setHandlers(assignHandlers(incomingHandlers));
  }, Object.values(incomingHandlers));

  // Invoke the resize handler when the size prop changes.
  useEffect(() => {
    handlers.resize(size);
  }, Object.values(size));

  // Re-render the Element if these properties change.
  useEffect(() => {
    if (!domNode) {
      return;
    }

    if (!reuseNode || !renderTarget.current) {
      resetRenderTarget();
    }

    try {
      renderFn(renderTarget.current!, config, handlers);
      firstRender.current = false;
    } catch (err) {
      onError(err, { title: strings.getRenderErrorMessage(functionName) });
    }
  }, [domNode, renderFn, config, handlers]);

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
