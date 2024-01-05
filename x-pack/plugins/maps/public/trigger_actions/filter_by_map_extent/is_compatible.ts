/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { apiIsOfType } from '@kbn/presentation-publishing';
import { MAP_SAVED_OBJECT_TYPE } from '../../../common/constants';
import { isLegacyMap } from '../../legacy_visualizations/is_legacy_map';
import type { FilterByMapExtentActionContext } from './types';

export function isCompatible({ embeddable }: FilterByMapExtentActionContext) {
  // TODO check legacy map and disableTriggers
  return apiIsOfType(embeddable, MAP_SAVED_OBJECT_TYPE);
  /*return (
    (embeddable.type === MAP_SAVED_OBJECT_TYPE || isLegacyMap(embeddable)) &&
    !embeddable.getInput().disableTriggers
  );*/
}
