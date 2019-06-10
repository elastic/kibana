/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import ReactDOM from 'react-dom';
import { RendererFactory } from '../types';
import { AdvancedFilter } from './component';

export const advancedFilter: RendererFactory = () => ({
  name: 'advanced_filter',
  displayName: 'Advanced filter',
  help: 'Render a Canvas filter expression',
  reuseDomNode: true,
  height: 50,
  render(domNode, _, handlers) {
    ReactDOM.render(
      <AdvancedFilter commit={handlers.setFilter} value={handlers.getFilter()} />,
      domNode,
      () => handlers.done()
    );

    handlers.onDestroy(() => {
      ReactDOM.unmountComponentAtNode(domNode);
    });
  },
});
