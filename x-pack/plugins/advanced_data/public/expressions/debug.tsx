/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import ReactDOM from 'react-dom';
import React from 'react';
import { RendererFactory } from '../../../../legacy/plugins/canvas/types';

export const debug: RendererFactory<any> = () => ({
  name: 'debug',
  displayName: 'debug',
  help: 'debug',
  reuseDomNode: true,
  render(domNode, config, handlers) {
    const renderDebug = () => (
      <div style={{ width: domNode.offsetWidth, height: domNode.offsetHeight }}>
        {JSON.stringify(config)}
      </div>
    );

    ReactDOM.render(renderDebug(), domNode, () => handlers.done());

    handlers.onResize(() => {
      ReactDOM.render(renderDebug(), domNode, () => handlers.done());
    });

    handlers.onDestroy(() => ReactDOM.unmountComponentAtNode(domNode));
  },
});
