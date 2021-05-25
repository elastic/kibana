/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { MapSavedObjectAttributes } from '../map_saved_object_type';

export function removeBoundsFromSavedObject({
  attributes,
}: {
  attributes: MapSavedObjectAttributes;
}): MapSavedObjectAttributes {
  const newAttributes = { ...attributes };
  // @ts-expect-error
  // This removes an unused parameter from pre 7.8=< saved objects
  delete newAttributes.bounds;
  return { ...newAttributes };
}
