/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export const RISK_SCORING_MAP_SCRIPT = `
Map fields = new HashMap();
String category = doc['event.kind'].value;
double score = doc['kibana.alert.risk_score'].value;
double weighted_score = 0.0;

fields.put('time', doc['@timestamp'].value);
fields.put('rule_name', doc['kibana.alert.rule.name'].value);
fields.put('category', category);
fields.put('index', doc['_index'].value);
fields.put('id', doc['kibana.alert.uuid'].value);
fields.put('score', score);
fields.put('weighted_score', weighted_score);

state.inputs.add(fields);
`;
