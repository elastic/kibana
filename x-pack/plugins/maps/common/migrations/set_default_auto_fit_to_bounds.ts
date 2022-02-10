/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
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

  // MapState type is defined in public, no need to pull type definition into common for this migration
  let mapState: { settings?: { autoFitToDataBounds: boolean } } = {};
  try {
    mapState = JSON.parse(attributes.mapStateJSON);
  } catch (e) {
    throw new Error('Unable to parse attribute mapStateJSON');
  }

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
