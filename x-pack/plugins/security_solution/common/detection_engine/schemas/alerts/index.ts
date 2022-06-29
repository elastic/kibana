/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  EqlBuildingBlockFields830,
  EqlShellFields830,
  WrappedFields830,
  DetectionAlert830,
  BaseFields830,
  Ancestor830,
} from './8.3.0';

import type { DetectionAlert800 } from './8.0.0';

// When new Alert schemas are created for new Kibana versions, add the DetectionAlert type from the new version
// here, e.g. `export type DetectionAlert = DetectionAlert800 | DetectionAlert820` if a new schema is created in 8.2.0
export type DetectionAlert = DetectionAlert800 | DetectionAlert830;

export type {
  Ancestor830 as AncestorLatest,
  BaseFields830 as BaseFieldsLatest,
  DetectionAlert830 as DetectionAlertLatest,
  WrappedFields830 as WrappedFieldsLatest,
  EqlBuildingBlockFields830 as EqlBuildingBlockFieldsLatest,
  EqlShellFields830 as EqlShellFieldsLatest,
};
