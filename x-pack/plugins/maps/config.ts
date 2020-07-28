/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { schema, TypeOf } from '@kbn/config-schema';

export interface MapsConfigType {
  enabled: boolean;
  showMapVisualizationTypes: boolean;
  showMapsInspectorAdapter: boolean;
  preserveDrawingBuffer: boolean;
}

export const configSchema = schema.object({
  enabled: schema.boolean({ defaultValue: true }),
  showMapVisualizationTypes: schema.boolean({ defaultValue: false }),
  // flag used in functional testing
  showMapsInspectorAdapter: schema.boolean({ defaultValue: false }),
  // flag used in functional testing
  preserveDrawingBuffer: schema.boolean({ defaultValue: false }),
});

export type MapsXPackConfig = TypeOf<typeof configSchema>;
