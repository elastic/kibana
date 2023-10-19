/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export const RULE_NAME_FIELD = 'alert.attributes.name';

export const RULE_PARAMS_FIELDS = {
  INDEX: 'alert.attributes.params.index',
  TACTIC_ID: 'alert.attributes.params.threat.tactic.id',
  TACTIC_NAME: 'alert.attributes.params.threat.tactic.name',
  TECHNIQUE_ID: 'alert.attributes.params.threat.technique.id',
  TECHNIQUE_NAME: 'alert.attributes.params.threat.technique.name',
  SUBTECHNIQUE_ID: 'alert.attributes.params.threat.technique.subtechnique.id',
  SUBTECHNIQUE_NAME: 'alert.attributes.params.threat.technique.subtechnique.name',
} as const;

export const ENABLED_FIELD = 'alert.attributes.enabled';
export const TAGS_FIELD = 'alert.attributes.tags';
export const PARAMS_TYPE_FIELD = 'alert.attributes.params.type';
export const PARAMS_IMMUTABLE_FIELD = 'alert.attributes.params.immutable';
export const LAST_RUN_OUTCOME_FIELD = 'alert.attributes.lastRun.outcome';
