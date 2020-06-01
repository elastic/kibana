/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import Joi from 'joi';

/* eslint-disable @typescript-eslint/camelcase */
export const anomaly_threshold = Joi.number().integer().greater(-1).less(101);
export const description = Joi.string();
export const enabled = Joi.boolean();
export const exclude_export_details = Joi.boolean();
export const false_positives = Joi.array().items(Joi.string());
export const file_name = Joi.string();
export const filters = Joi.array();
export const from = Joi.string();
export const immutable = Joi.boolean();
export const rule_id = Joi.string();
export const id = Joi.string();
export const index = Joi.array().items(Joi.string()).single();
export const interval = Joi.string();
export const query = Joi.string();
export const language = Joi.string().valid('kuery', 'lucene');
export const objects = Joi.array().items(
  Joi.object({
    rule_id,
  }).required()
);
export const output_index = Joi.string();
export const saved_id = Joi.string();
export const timeline_id = Joi.string();
export const timeline_title = Joi.string().when('timeline_id', {
  is: Joi.exist(),
  then: Joi.required(),
  otherwise: Joi.forbidden(),
});
export const meta = Joi.object();
export const max_signals = Joi.number().integer().greater(0);
export const name = Joi.string();
export const risk_score = Joi.number().integer().greater(-1).less(101);
export const severity = Joi.string().valid('low', 'medium', 'high', 'critical');
export const status = Joi.string().valid('open', 'closed');
export const to = Joi.string();
export const type = Joi.string().valid('query', 'saved_query', 'machine_learning');
export const machine_learning_job_id = Joi.string();
export const queryFilter = Joi.string();
export const references = Joi.array().items(Joi.string()).single();
export const per_page = Joi.number().integer().min(0).default(20);
export const page = Joi.number().integer().min(1).default(1);
export const signal_ids = Joi.array().items(Joi.string());
export const signal_status_query = Joi.object();
export const sort_field = Joi.string();
export const sort_order = Joi.string().valid('asc', 'desc');
export const tags = Joi.array().items(Joi.string());
export const fields = Joi.array().items(Joi.string()).single();
export const threat_framework = Joi.string();
export const threat_tactic_id = Joi.string();
export const threat_tactic_name = Joi.string();
export const threat_tactic_reference = Joi.string();
export const threat_tactic = Joi.object({
  id: threat_tactic_id.required(),
  name: threat_tactic_name.required(),
  reference: threat_tactic_reference.required(),
});
export const threat_technique_id = Joi.string();
export const threat_technique_name = Joi.string();
export const threat_technique_reference = Joi.string();
export const threat_technique = Joi.object({
  id: threat_technique_id.required(),
  name: threat_technique_name.required(),
  reference: threat_technique_reference.required(),
});
export const threat_techniques = Joi.array().items(threat_technique.required());
export const threat = Joi.array().items(
  Joi.object({
    framework: threat_framework.required(),
    tactic: threat_tactic.required(),
    technique: threat_techniques.required(),
  })
);
export const created_at = Joi.string().isoDate().strict();
export const updated_at = Joi.string().isoDate().strict();
export const created_by = Joi.string();
export const updated_by = Joi.string();
export const version = Joi.number().integer().min(1);
export const action_group = Joi.string();
export const action_id = Joi.string();
export const action_action_type_id = Joi.string();
export const action_params = Joi.object();
export const action = Joi.object({
  group: action_group.required(),
  id: action_id.required(),
  action_type_id: action_action_type_id.required(),
  params: action_params.required(),
});
export const actions = Joi.array().items(action);
export const throttle = Joi.string().allow(null);
export const note = Joi.string();

// NOTE: Experimental list support not being shipped currently and behind a feature flag
// TODO: (LIST-FEATURE) Remove this comment once we lists have passed testing and is ready for the release
export const list_field = Joi.string();
export const list_values_operator = Joi.string().valid(['included', 'excluded']);
export const list_values_types = Joi.string().valid(['match', 'match_all', 'list', 'exists']);
export const list_values = Joi.object({
  name: Joi.string().required(),
  id: Joi.string(),
  description: Joi.string(),
  created_at,
});
export const list = Joi.object({
  field: list_field.required(),
  values_operator: list_values_operator.required(),
  values_type: list_values_types.required(),
  values: Joi.when('values_type', {
    is: 'exists',
    then: Joi.forbidden(),
    otherwise: Joi.array().items(list_values).required(),
  }),
});
export const list_and = Joi.object({
  and: Joi.array().items(list),
});
export const lists = Joi.array().items(list.concat(list_and));
