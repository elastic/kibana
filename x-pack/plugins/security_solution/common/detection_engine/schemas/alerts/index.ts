/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { DetectionAlert800 } from './8.0.0';

import type { DetectionAlert840 } from './8.4.0';
import type { DetectionAlert860 } from './8.6.0';
import type { DetectionAlert870 } from './8.7.0';
import type {
  Ancestor880,
  BaseFields880,
  DetectionAlert880,
  EqlBuildingBlockFields880,
  EqlShellFields880,
  NewTermsFields880,
  WrappedFields880,
} from './8.8.0';

// When new Alert schemas are created for new Kibana versions, add the DetectionAlert type from the new version
// here, e.g. `export type DetectionAlert = DetectionAlert800 | DetectionAlert820` if a new schema is created in 8.2.0
export type DetectionAlert =
  | DetectionAlert800
  | DetectionAlert840
  | DetectionAlert860
  | DetectionAlert870
  | DetectionAlert880;

export type {
  Ancestor880 as AncestorLatest,
  BaseFields880 as BaseFieldsLatest,
  DetectionAlert880 as DetectionAlertLatest,
  WrappedFields880 as WrappedFieldsLatest,
  EqlBuildingBlockFields880 as EqlBuildingBlockFieldsLatest,
  EqlShellFields880 as EqlShellFieldsLatest,
  NewTermsFields880 as NewTermsFieldsLatest,
};
