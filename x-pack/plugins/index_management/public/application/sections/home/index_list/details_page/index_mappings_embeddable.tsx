/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { lazy, Suspense, ComponentType, LazyExoticComponent } from 'react';
import { DetailsPageMappings } from './details_page_mappings';

const lazyRender =
  <P extends {}>(
    Component: LazyExoticComponent<ComponentType<P>>
  ): React.FC<React.ComponentProps<typeof Component>> =>
  (props) =>
    (
      <Suspense fallback={null}>
        <Component {...props} />
      </Suspense>
    );

export const IndexMappings = lazyRender<React.ComponentProps<typeof DetailsPageMappings>>(
  lazy<typeof DetailsPageMappings>(async () => ({
    default: (await import('./details_page_mappings')).DetailsPageMappings,
  }))
);
