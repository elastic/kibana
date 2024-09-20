/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { LensComponentProps, LensPublicCallbacks } from '../types';

function isObject(api: unknown): api is object {
  return Boolean(api && typeof api === 'object');
}

// This file contains few utility typeguards to check if the parentApi provided
// comes from a Lens component or else

export function apiHasLensComponentCallbacks(api: unknown): api is LensPublicCallbacks {
  return (
    isObject(api) &&
    ['onFilter', 'onBrushEnd', 'onLoad', 'onTableRowClick', 'onBeforeBadgesRender'].some((fn) =>
      Object.hasOwn(api, fn)
    )
  );
}

export function apiHasLensComponentProps(api: unknown): api is LensComponentProps {
  return (
    isObject(api) &&
    ['style', 'className', 'noPadding', 'viewModets'].some((prop) => Object.hasOwn(api, prop))
  );
}
