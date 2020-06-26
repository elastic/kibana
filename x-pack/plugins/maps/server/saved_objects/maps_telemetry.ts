/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { SavedObjectsType } from 'src/core/server';

/*
 * The maps-telemetry saved object type isn't used, but in order to remove these fields from
 * the mappings we register this type with `type: 'object', enabled: true` to remove all
 * previous fields from the mappings until https://github.com/elastic/kibana/issues/67086 is
 * solved.
 */
export const mapsTelemetrySavedObjects: SavedObjectsType = {
  name: 'maps-telemetry',
  hidden: false,
  namespaceType: 'agnostic',
  mappings: {
    // @ts-ignore Core types don't support this since it's only really valid when removing a previously registered type
    type: 'object',
    enabled: false,
  },
};
