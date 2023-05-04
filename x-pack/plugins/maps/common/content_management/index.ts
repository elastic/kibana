/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export { LATEST_VERSION, CONTENT_ID } from './constants';

export type { MapContentType } from './types';

export type {
  MapAttributes,
  MapItem,
  PartialMapItem,
  MapGetIn,
  MapGetOut,
  MapCreateIn,
  MapCreateOut,
  MapCreateOptions,
  MapUpdateIn,
  MapUpdateOut,
  MapUpdateOptions,
  MapDeleteIn,
  MapDeleteOut,
  MapSearchIn,
  MapSearchOptions,
  MapSearchOut,
} from './latest';

// Today "v1" === "latest" so the export under MapV1 namespace is not really useful
// We leave it as a reference for future version when it will be needed to export/support older types
// in the UIs.
export * as MapV1 from './v1';
