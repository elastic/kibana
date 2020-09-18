/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Trigger } from '../../../../../src/plugins/ui_actions/public';

export const SWIM_LANE_SELECTION_TRIGGER = 'SWIM_LANE_SELECTION_TRIGGER';

export const swimLaneSelectionTrigger: Trigger<'SWIM_LANE_SELECTION_TRIGGER'> = {
  id: SWIM_LANE_SELECTION_TRIGGER,
  // This is empty string to hide title of ui_actions context menu that appears
  // when this trigger is executed.
  title: '',
  description: 'Swim lane selection triggered',
};
