/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { DetectionAlert800 } from './8.0.0';
import type { DetectionAlert840, EqlShellFields840, NewTermsFields840 } from './8.4.0';

import type {
  BaseFields850,
  WrappedFields850,
  EqlBuildingBlockFields850,
  DetectionAlert850,
  Ancestor840,
} from './8.5.0';

// When new Alert schemas are created for new Kibana versions, add the DetectionAlert type from the new version
// here, e.g. `export type DetectionAlert = DetectionAlert800 | DetectionAlert820` if a new schema is created in 8.2.0
export type DetectionAlert = DetectionAlert800 | DetectionAlert840 | DetectionAlert850;

export type {
  Ancestor840 as AncestorLatest,
  BaseFields850 as BaseFieldsLatest,
  DetectionAlert850 as DetectionAlertLatest,
  WrappedFields850 as WrappedFieldsLatest,
  EqlBuildingBlockFields850 as EqlBuildingBlockFieldsLatest,
  EqlShellFields840 as EqlShellFieldsLatest,
  NewTermsFields840 as NewTermsFieldsLatest,
};
