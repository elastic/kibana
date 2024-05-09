/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export const RISK_SCORING_REDUCE_SCRIPT = `
Map results = new HashMap();
List inputs = [];
for (state in states) {
  inputs.addAll(state.inputs)
}
Collections.sort(inputs, (a, b) -> b.get('weighted_score').compareTo(a.get('weighted_score')));

double num_inputs_to_score = Math.min(inputs.length, params.max_risk_inputs_per_identity);
results['notes'] = [];
if (num_inputs_to_score == params.max_risk_inputs_per_identity) {
  results['notes'].add('Number of risk inputs (' + inputs.length + ') exceeded the maximum allowed (' + params.max_risk_inputs_per_identity + ').');
}

results['category_1_score'] = 0.0;
results['category_1_count'] = 0;

double total_score = 0;
double current_score = 0;
List risk_inputs = [];
for (int i = 0; i < num_inputs_to_score; i++) {
  current_score = inputs[i].weighted_score / Math.pow(i + 1, params.p);

  if (i < 10) {
    inputs[i]["contribution"] = 100 * current_score / params.risk_cap;
    risk_inputs.add(inputs[i]);
  }

  if (inputs[i].category == 'signal') {
    results['category_1_score'] += current_score; results['category_1_count'] += 1;
  }

  total_score += current_score;
}

if (params.containsKey('global_identifier_type_weight') && params.global_identifier_type_weight != null) {
  total_score *= params.global_identifier_type_weight;
}

double score_norm = 100 * total_score / params.risk_cap;
results['score'] = total_score;
results['normalized_score'] = score_norm;
results['risk_inputs'] = risk_inputs;

return results;
`;
