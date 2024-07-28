/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  ENTITY_BASE_PREFIX,
  ENTITY_HISTORY,
  ENTITY_LATEST,
} from '@kbn/entities-data-access-plugin/common';
import { ENTITY_SCHEMA_VERSION_V1 } from '../../../../common/constants_entities';

export const getEntityHistoryIndexTemplateV1 = (definitionId: string) =>
  `${ENTITY_BASE_PREFIX}_${ENTITY_SCHEMA_VERSION_V1}_${ENTITY_HISTORY}_${definitionId}_index_template` as const;

export const getEntityLatestIndexTemplateV1 = (definitionId: string) =>
  `${ENTITY_BASE_PREFIX}_${ENTITY_SCHEMA_VERSION_V1}_${ENTITY_LATEST}_${definitionId}_index_template` as const;

export const getCustomLatestTemplateComponents = (definitionId: string) => [
  `${definitionId}@platform`, // @platform goes before so it can be overwritten by custom
  `${definitionId}-latest@platform`,
  `${definitionId}@custom`,
  `${definitionId}-latest@custom`,
];

export const getCustomHistoryTemplateComponents = (definitionId: string) => [
  `${definitionId}@platform`, // @platform goes before so it can be overwritten by custom
  `${definitionId}-history@platform`,
  `${definitionId}@custom`,
  `${definitionId}-history@custom`,
];
