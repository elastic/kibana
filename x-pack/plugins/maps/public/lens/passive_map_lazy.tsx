/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { dynamic } from '@kbn/shared-ux-utility';
import type { Props } from './passive_map';

const Component = dynamic(async () => {
  const { PassiveMap } = await import('./passive_map');
  return {
    default: PassiveMap,
  };
});

export function PassiveMapLazy(props: Props) {
  return <Component {...props} />;
}
