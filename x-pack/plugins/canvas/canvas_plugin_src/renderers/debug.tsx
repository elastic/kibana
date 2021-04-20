/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import ReactDOM from 'react-dom';
import React from 'react';
import { Debug } from '../../public/components/debug';
import { RendererStrings } from '../../i18n';
import { RendererFactory } from '../../types';

const { debug: strings } = RendererStrings;

export const debug: RendererFactory<any> = () => ({
  name: 'debug',
  displayName: strings.getDisplayName(),
  help: strings.getHelpDescription(),
  reuseDomNode: true,
  render(domNode, config, handlers) {
    const renderDebug = () => (
      <div style={{ width: domNode.offsetWidth, height: domNode.offsetHeight }}>
        <Debug payload={config} />
      </div>
    );

    ReactDOM.render(renderDebug(), domNode, () => handlers.done());

    if (handlers.onResize) {
      handlers.onResize(() => {
        ReactDOM.render(renderDebug(), domNode, () => handlers.done());
      });
    }

    handlers.onDestroy(() => ReactDOM.unmountComponentAtNode(domNode));
  },
});
