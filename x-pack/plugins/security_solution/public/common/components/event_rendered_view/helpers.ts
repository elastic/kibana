/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { isEmpty } from 'lodash/fp';
import type { Ecs } from '../../../../common/ecs';

export const isEventBuildingBlockType = (event: Ecs): boolean =>
  !isEmpty(event.kibana?.alert?.building_block_type);

/** This local storage key stores the `Grid / Event rendered view` selection */
export const ALERTS_TABLE_VIEW_SELECTION_KEY = 'securitySolution.alerts.table.view-selection';
