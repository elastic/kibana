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
import type {
  Ancestor890,
  BaseFields890,
  DetectionAlert890,
  EqlBuildingBlockFields890,
  EqlShellFields890,
  NewTermsFields890,
  WrappedFields890,
} from './8.9.0';

// When new Alert schemas are created for new Kibana versions, add the DetectionAlert type from the new version
// here, e.g. `export type DetectionAlert = DetectionAlert800 | DetectionAlert820` if a new schema is created in 8.2.0
export type DetectionAlert =
  | DetectionAlert800
  | DetectionAlert840
  | DetectionAlert860
  | DetectionAlert870
  | DetectionAlert880
  | DetectionAlert890;

export type {
  Ancestor890 as AncestorLatest,
  BaseFields890 as BaseFieldsLatest,
  DetectionAlert890 as DetectionAlertLatest,
  WrappedFields890 as WrappedFieldsLatest,
  EqlBuildingBlockFields890 as EqlBuildingBlockFieldsLatest,
  EqlShellFields890 as EqlShellFieldsLatest,
  NewTermsFields890 as NewTermsFieldsLatest,
};
