/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { MapSavedObjectAttributes } from '../map_saved_object_type';

export function setDefaultAutoFitToBounds({
  attributes,
}: {
  attributes: MapSavedObjectAttributes;
}): MapSavedObjectAttributes {
  if (!attributes || !attributes.mapStateJSON) {
    return attributes;
  }

  // MapState type is defined in public, no need to bring all of that to common for this migration
  const mapState: { settings?: { autoFitToDataBounds: boolean } } = JSON.parse(
    attributes.mapStateJSON
  );
  if ('settings' in mapState) {
    mapState.settings!.autoFitToDataBounds = false;
  } else {
    mapState.settings = {
      autoFitToDataBounds: false,
    };
  }

  return {
    ...attributes,
    mapStateJSON: JSON.stringify(mapState),
  };
}
