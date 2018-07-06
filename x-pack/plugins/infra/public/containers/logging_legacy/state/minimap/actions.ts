/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import actionCreatorFactory from 'typescript-fsa';

import { TimeScale } from '../../../../../common/time';

const actionCreator = actionCreatorFactory('kibana/logging/minimap');

export const setMinimapScale = actionCreator<{
  scale: TimeScale;
}>('SET_MINIMAP_SCALE');
