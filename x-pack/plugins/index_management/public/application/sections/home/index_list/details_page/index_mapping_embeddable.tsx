/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { lazy, Suspense, ComponentType } from 'react';
import { DetailsPageMappingsProps } from './details_page_mappings_types';

const DetailsPageMappings = lazy<ComponentType<DetailsPageMappingsProps>>(async () => {
  return {
    default: (await import('./details_page_mappings')).DetailsPageMappings,
  };
});

export const IndexMapping: React.FC<DetailsPageMappingsProps> = (props) => {
  return (
    <Suspense fallback={null}>
      <DetailsPageMappings {...props} />
    </Suspense>
  );
};
