/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { dynamic } from '@kbn/shared-ux-utility';
import type { Props } from './map_component';

const Component = dynamic(async () => {
  const { MapComponent } = await import('./map_component');
  return {
    default: MapComponent,
  };
});

export function MapComponentLazy(props: Props) {
  return <Component {...props} />;
}
