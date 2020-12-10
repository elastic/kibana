/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import {
  APPLY_FILTER_TRIGGER,
  SELECT_RANGE_TRIGGER,
  TriggerId,
  VALUE_CLICK_TRIGGER,
} from '../../../../../../../src/plugins/ui_actions/public';

/**
 * We know that VALUE_CLICK_TRIGGER and SELECT_RANGE_TRIGGER are also triggering APPLY_FILTER_TRIGGER.
 * This function appends APPLY_FILTER_TRIGGER to the list of triggers if either VALUE_CLICK_TRIGGER
 * or SELECT_RANGE_TRIGGER was executed.
 *
 * TODO: this probably should be part of uiActions infrastructure,
 * but dynamic implementation of nested trigger doesn't allow to statically express such relations
 *
 * @param triggers
 */
export function ensureNestedTriggers(triggers: TriggerId[]): TriggerId[] {
  if (
    !triggers.includes(APPLY_FILTER_TRIGGER) &&
    (triggers.includes(VALUE_CLICK_TRIGGER) || triggers.includes(SELECT_RANGE_TRIGGER))
  ) {
    return [...triggers, APPLY_FILTER_TRIGGER];
  }

  return triggers;
}
