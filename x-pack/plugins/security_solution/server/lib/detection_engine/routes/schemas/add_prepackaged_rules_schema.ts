/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import Joi from 'joi';

/* eslint-disable @typescript-eslint/camelcase */
import {
  actions,
  enabled,
  description,
  false_positives,
  filters,
  from,
  immutable,
  index,
  rule_id,
  interval,
  query,
  language,
  saved_id,
  timeline_id,
  timeline_title,
  meta,
  risk_score,
  max_signals,
  name,
  severity,
  tags,
  to,
  type,
  threat,
  throttle,
  references,
  note,
  version,
  lists,
  anomaly_threshold,
  machine_learning_job_id,
} from './schemas';
/* eslint-enable @typescript-eslint/camelcase */

import { DEFAULT_MAX_SIGNALS } from '../../../../../common/constants';
import { hasListsFeature } from '../../feature_flags';

/**
 * Big differences between this schema and the createRulesSchema
 *  - rule_id is required here
 *  - output_index is not allowed (and instead the space index must be used)
 *  - immutable is forbidden but defaults to true instead of to false and it can only ever be true
 *  - enabled defaults to false instead of true
 *  - version is a required field that must exist
 *  - index is a required field that must exist if type !== machine_learning
 */
export const addPrepackagedRulesSchema = Joi.object({
  actions: actions.default([]),
  anomaly_threshold: anomaly_threshold.when('type', {
    is: 'machine_learning',
    then: Joi.required(),
    otherwise: Joi.forbidden(),
  }),
  description: description.required(),
  enabled: enabled.default(false),
  false_positives: false_positives.default([]),
  filters,
  from: from.default('now-6m'),
  rule_id: rule_id.required(),
  immutable: immutable.forbidden().default(true).valid(true),
  index: index.when('type', {
    is: 'machine_learning',
    then: Joi.forbidden(),
    otherwise: Joi.required(),
  }),
  interval: interval.default('5m'),
  query: query.when('type', {
    is: 'machine_learning',
    then: Joi.forbidden(),
    otherwise: query.allow('').default(''),
  }),
  language: language.when('type', {
    is: 'machine_learning',
    then: Joi.forbidden(),
    otherwise: language.default('kuery'),
  }),
  machine_learning_job_id: machine_learning_job_id.when('type', {
    is: 'machine_learning',
    then: Joi.required(),
    otherwise: Joi.forbidden(),
  }),
  saved_id: saved_id.when('type', {
    is: 'saved_query',
    then: Joi.required(),
    otherwise: Joi.forbidden(),
  }),
  timeline_id,
  timeline_title,
  meta,
  risk_score: risk_score.required(),
  max_signals: max_signals.default(DEFAULT_MAX_SIGNALS),
  name: name.required(),
  severity: severity.required(),
  tags: tags.default([]),
  to: to.default('now'),
  type: type.required(),
  threat: threat.default([]),
  throttle: throttle.default(null),
  references: references.default([]),
  note: note.allow(''),
  version: version.required(),

  // TODO: (LIST-FEATURE) Remove the hasListsFeatures once this is ready for release
  exceptions_list: hasListsFeature() ? lists.default([]) : lists.forbidden().default([]),
});
