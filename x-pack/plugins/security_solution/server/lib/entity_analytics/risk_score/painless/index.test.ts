/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getPainlessScripts } from '.';

describe('getPainlessScripts', () => {
  // to update snapshot run `yarn test:jest x-pack/plugins/security_solution/server/lib/entity_analytics/risk_score/painless/index.test.ts -u`
  test('Scripts should not have changed. If this change is intentional, ensure that Serverless scripted metric allowlists are updated', async () => {
    const scripts = await getPainlessScripts();

    expect(scripts).toMatchInlineSnapshot(`
      Object {
        "combine": "return state;",
        "init": "state.inputs = []",
        "map": "Map fields = new HashMap();fields.put('id', doc['kibana.alert.uuid'].value);fields.put('index', doc['_index'].value);fields.put('time', doc['@timestamp'].value);fields.put('rule_name', doc['kibana.alert.rule.name'].value);fields.put('category', doc['event.kind'].value);fields.put('score', doc['kibana.alert.risk_score'].value);state.inputs.add(fields); ",
        "reduce": "Map results = new HashMap();results['notes'] = [];results['category_1_score'] = 0.0;results['category_1_count'] = 0;results['risk_inputs'] = [];results['score'] = 0.0;def inputs = states[0].inputs;Collections.sort(inputs, (a, b) -> b.get('score').compareTo(a.get('score')));for (int i = 0; i < inputs.length; i++) { double current_score = inputs[i].score / Math.pow(i + 1, params.p); if (i < 10) { inputs[i]['contribution'] = current_score / params.risk_cap; results['risk_inputs'].add(inputs[i]); } results['category_1_score'] += current_score; results['category_1_count'] += 1; results['score'] += current_score;}results['score'] *= params.global_identifier_type_weight;results['normalized_score'] = results['score'] / params.risk_cap;return results;",
      }
    `);
  });
});
