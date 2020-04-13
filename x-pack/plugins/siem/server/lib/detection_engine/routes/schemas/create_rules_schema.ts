/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import Joi from 'joi';

/* eslint-disable @typescript-eslint/camelcase */
import {
  actions,
  anomaly_threshold,
  enabled,
  description,
  false_positives,
  filters,
  from,
  index,
  rule_id,
  interval,
  query,
  language,
  output_index,
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
  machine_learning_job_id,
} from './schemas';
/* eslint-enable @typescript-eslint/camelcase */

import { DEFAULT_MAX_SIGNALS } from '../../../../../common/constants';
import { hasListsFeature } from '../../feature_flags';

export const createRulesSchema = Joi.object({
  actions: actions.default([]),
  anomaly_threshold: anomaly_threshold.when('type', {
    is: 'machine_learning',
    then: Joi.required(),
    otherwise: Joi.forbidden(),
  }),
  description: description.required(),
  enabled: enabled.default(true),
  false_positives: false_positives.default([]),
  filters,
  from: from.default('now-6m'),
  rule_id,
  index,
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
  output_index,
  saved_id: saved_id.when('type', {
    is: 'saved_query',
    then: Joi.required(),
    otherwise: Joi.forbidden(),
  }),
  timeline_id,
  timeline_title,
  meta,
  machine_learning_job_id: machine_learning_job_id.when('type', {
    is: 'machine_learning',
    then: Joi.required(),
    otherwise: Joi.forbidden(),
  }),
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
  version: version.default(1),

  // TODO: (LIST-FEATURE) Remove the hasListsFeatures once this is ready for release
  lists: hasListsFeature() ? lists.default([]) : lists.forbidden().default([]),
});
