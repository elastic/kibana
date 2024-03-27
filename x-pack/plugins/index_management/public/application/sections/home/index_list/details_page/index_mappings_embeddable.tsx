/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiLoadingSpinner } from '@elastic/eui';
import { dynamic } from '@kbn/shared-ux-utility';
import React, { Suspense, ComponentType } from 'react';
import { IndexMappingWithContextProps } from './index_mapping_with_context_types';

// const IndexMappingWithContext = lazy<ComponentType<IndexMappingWithContextProps>>(async () => {
//   return {
//     default: (await import('./index_mapping_with_context')).IndexMappingWithContext,
//   };
// });

const IndexMappingWithContext = dynamic<ComponentType<IndexMappingWithContextProps>>(() =>
  import('./index_mapping_with_context').then((mod) => ({ default: mod.IndexMappingWithContext }))
);

export const IndexMapping: React.FC<IndexMappingWithContextProps> = (props) => {
  return (
    <Suspense fallback={<EuiLoadingSpinner />}>
      <IndexMappingWithContext {...props} />
    </Suspense>
  );
};
