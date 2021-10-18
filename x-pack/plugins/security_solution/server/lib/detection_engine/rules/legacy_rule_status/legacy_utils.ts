/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Given an id this returns a legacy rule reference.
 * @param id The id of the alert
 * @deprecated Remove this once we've fully migrated to event-log and no longer require addition status SO (8.x)
 */
export const legacyGetRuleReference = (id: string) => ({
  id,
  type: 'alert',
  name: 'alert_0',
});
