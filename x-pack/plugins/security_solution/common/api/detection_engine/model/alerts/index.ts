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
import type { DetectionAlert880 } from './8.8.0';
import type { DetectionAlert890 } from './8.9.0';
import type {
  Ancestor8110,
  BaseFields8110,
  DetectionAlert8110,
  EqlBuildingBlockFields8110,
  EqlShellFields8110,
  NewTermsFields8110,
  WrappedFields8110,
} from './8.11.0';

// When new Alert schemas are created for new Kibana versions, add the DetectionAlert type from the new version
// here, e.g. `export type DetectionAlert = DetectionAlert800 | DetectionAlert820` if a new schema is created in 8.2.0
export type DetectionAlert =
  | DetectionAlert800
  | DetectionAlert840
  | DetectionAlert860
  | DetectionAlert870
  | DetectionAlert880
  | DetectionAlert890
  | DetectionAlert8110;

export type {
  Ancestor8110 as AncestorLatest,
  BaseFields8110 as BaseFieldsLatest,
  DetectionAlert8110 as DetectionAlertLatest,
  WrappedFields8110 as WrappedFieldsLatest,
  EqlBuildingBlockFields8110 as EqlBuildingBlockFieldsLatest,
  EqlShellFields8110 as EqlShellFieldsLatest,
  NewTermsFields8110 as NewTermsFieldsLatest,
};
