/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { MermaidParser } from './parser';
import type { MermaidProps } from './mermaid';

const LazyMermaid = React.lazy(() => import('./mermaid'));

const MermaidRenderer = (props: MermaidProps) => (
  <React.Suspense fallback={null}>
    <LazyMermaid {...props} />
  </React.Suspense>
);

MermaidRenderer.displayName = 'MermaidRenderer';

export type { MermaidProps };
export { MermaidParser as parser, MermaidRenderer as renderer };
