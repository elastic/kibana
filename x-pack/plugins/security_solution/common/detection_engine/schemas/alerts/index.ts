/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { DetectionAlert800 } from './8.0.0';

import type {
  Ancestor840,
  BaseFields840,
  DetectionAlert840,
  WrappedFields840,
  EqlBuildingBlockFields840,
  EqlShellFields840,
  NewTermsFields840,
} from './8.4.0';

import type { DetectionAlert860, SuppressionFields860 } from './8.6.0';

// When new Alert schemas are created for new Kibana versions, add the DetectionAlert type from the new version
// here, e.g. `export type DetectionAlert = DetectionAlert800 | DetectionAlert820` if a new schema is created in 8.2.0
export type DetectionAlert = DetectionAlert800 | DetectionAlert840 | DetectionAlert860;

export type {
  Ancestor840 as AncestorLatest,
  BaseFields840 as BaseFieldsLatest,
  DetectionAlert860 as DetectionAlertLatest,
  WrappedFields840 as WrappedFieldsLatest,
  EqlBuildingBlockFields840 as EqlBuildingBlockFieldsLatest,
  EqlShellFields840 as EqlShellFieldsLatest,
  NewTermsFields840 as NewTermsFieldsLatest,
  SuppressionFields860 as SuppressionFieldsLatest,
};
