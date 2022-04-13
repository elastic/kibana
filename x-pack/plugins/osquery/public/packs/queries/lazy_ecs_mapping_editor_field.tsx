/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { lazy, Suspense } from 'react';
import type {
  ECSMappingEditorFieldProps,
  ECSMappingEditorFieldRef,
} from './ecs_mapping_editor_field';

const LazyECSMappingEditorField = lazy(() => import('./ecs_mapping_editor_field'));

export type { ECSMappingEditorFieldProps, ECSMappingEditorFieldRef };
export const ECSMappingEditorField = (props: ECSMappingEditorFieldProps) => (
  <Suspense fallback={null}>
    <LazyECSMappingEditorField {...props} />
  </Suspense>
);
