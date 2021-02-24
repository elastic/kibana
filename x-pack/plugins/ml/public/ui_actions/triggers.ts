/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Trigger } from '../../../../../src/plugins/ui_actions/public';

export const SWIM_LANE_SELECTION_TRIGGER = 'SWIM_LANE_SELECTION_TRIGGER';

export const swimLaneSelectionTrigger: Trigger = {
  id: SWIM_LANE_SELECTION_TRIGGER,
  // This is empty string to hide title of ui_actions context menu that appears
  // when this trigger is executed.
  title: '',
  description: 'Swim lane selection triggered',
};
