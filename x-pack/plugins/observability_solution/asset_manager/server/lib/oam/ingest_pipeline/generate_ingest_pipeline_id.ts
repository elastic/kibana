/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { OAMDefinition } from '@kbn/oam-schema';
import { OAM_BASE_PREFIX } from '../../../../common/constants_oam';

export function generateIngestPipelineId(definition: OAMDefinition) {
  return `${OAM_BASE_PREFIX}.${definition.id}`;
}
