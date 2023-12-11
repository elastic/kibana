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
  Ancestor8120,
  BaseFields8120,
  DetectionAlert8120,
  EqlBuildingBlockFields8120,
  EqlShellFields8120,
  NewTermsFields8120,
  WrappedFields8120,
} from './8.12.0';

// When new Alert schemas are created for new Kibana versions, add the DetectionAlert type from the new version
// here, e.g. `export type DetectionAlert = DetectionAlert800 | DetectionAlert820` if a new schema is created in 8.2.0
export type DetectionAlert =
  | DetectionAlert800
  | DetectionAlert840
  | DetectionAlert860
  | DetectionAlert870
  | DetectionAlert880
  | DetectionAlert890
  | DetectionAlert8120;

export type {
  Ancestor8120 as AncestorLatest,
  BaseFields8120 as BaseFieldsLatest,
  DetectionAlert8120 as DetectionAlertLatest,
  WrappedFields8120 as WrappedFieldsLatest,
  EqlBuildingBlockFields8120 as EqlBuildingBlockFieldsLatest,
  EqlShellFields8120 as EqlShellFieldsLatest,
  NewTermsFields8120 as NewTermsFieldsLatest,
};
