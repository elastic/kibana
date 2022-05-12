/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  Ancestor800,
  BaseFields800,
  DetectionAlert800,
  WrappedFields800,
  EqlBuildingBlockFields800,
  EqlShellFields800,
} from './8.0.0';

// When new Alert schemas are created for new Kibana versions, add the DetectionAlert type from the new version
// here, e.g. `export type DetectionAlert = DetectionAlert800 | DetectionAlert820` if a new schema is created in 8.2.0
export type DetectionAlert = DetectionAlert800;

export type {
  Ancestor800 as AncestorLatest,
  BaseFields800 as BaseFieldsLatest,
  DetectionAlert800 as DetectionAlertLatest,
  WrappedFields800 as WrappedFieldsLatest,
  EqlBuildingBlockFields800 as EqlBuildingBlockFieldsLatest,
  EqlShellFields800 as EqlShellFieldsLatest,
};
