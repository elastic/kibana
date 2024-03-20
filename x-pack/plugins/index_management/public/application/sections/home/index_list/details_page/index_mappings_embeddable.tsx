/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { lazy, Suspense, ComponentType } from 'react';
import { IndexMappingWithContextProps } from './index_mapping_with_context_types';

const IndexMappingWithContext = lazy<ComponentType<IndexMappingWithContextProps>>(async () => {
  return {
    default: (await import('./index_mapping_with_context')).IndexMappingWithContext,
  };
});

export const IndexMapping: React.FC<IndexMappingWithContextProps> = (props) => {
  return (
    <Suspense fallback={null}>
      <IndexMappingWithContext {...props} />
    </Suspense>
  );
};
