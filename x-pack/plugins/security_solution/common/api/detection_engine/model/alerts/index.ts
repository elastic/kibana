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
import type { DetectionAlert8120 } from './8.12.0';
import type {
  Ancestor8130,
  BaseFields8130,
  DetectionAlert8130,
  EqlBuildingBlockFields8130,
  EqlShellFields8130,
  NewTermsFields8130,
  WrappedFields8130,
} from './8.13.0';

// When new Alert schemas are created for new Kibana versions, add the DetectionAlert type from the new version
// here, e.g. `export type DetectionAlert = DetectionAlert800 | DetectionAlert820` if a new schema is created in 8.2.0
export type DetectionAlert =
  | DetectionAlert800
  | DetectionAlert840
  | DetectionAlert860
  | DetectionAlert870
  | DetectionAlert880
  | DetectionAlert890
  | DetectionAlert8120
  | DetectionAlert8130;

export type {
  Ancestor8130 as AncestorLatest,
  BaseFields8130 as BaseFieldsLatest,
  DetectionAlert8130 as DetectionAlertLatest,
  WrappedFields8130 as WrappedFieldsLatest,
  EqlBuildingBlockFields8130 as EqlBuildingBlockFieldsLatest,
  EqlShellFields8130 as EqlShellFieldsLatest,
  NewTermsFields8130 as NewTermsFieldsLatest,
};
