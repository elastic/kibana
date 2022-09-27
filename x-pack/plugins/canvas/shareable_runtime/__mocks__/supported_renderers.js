/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createRoot } from 'react-dom/client';
import React from 'react';

const renderers = [
  'debug',
  'error',
  'image',
  'repeatImage',
  'revealImage',
  'markdown',
  'metric',
  'pie',
  'plot',
  'progress',
  'shape',
  'table',
  'text',
];

/**
 * Mock all of the render functions to return a `div` containing
 * a predictable string.
 */
export const renderFunctions = renderers.map((fn) => () => ({
  name: fn,
  displayName: fn,
  help: fn,
  reuseDomNode: true,
  render: (domNode) => {
    const root = createRoot(domNode);
    root.render(<div>{fn} mock</div>);
  },
}));
