/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { experimentalRuleFieldMap } from './experimental_rule_field_map';

// This test purely exists to see what the resultant mappings are and
// make it obvious when some dependency results in the mappings changing
it('matches snapshot', () => {
  expect(experimentalRuleFieldMap).toMatchInlineSnapshot(`
    Object {
      "kibana.alert.evaluation.threshold": Object {
        "scaling_factor": 100,
        "type": "scaled_float",
      },
      "kibana.alert.evaluation.value": Object {
        "scaling_factor": 100,
        "type": "scaled_float",
      },
      "kibana.alert.instance.id": Object {
        "required": true,
        "type": "keyword",
      },
    }
  `);
});
