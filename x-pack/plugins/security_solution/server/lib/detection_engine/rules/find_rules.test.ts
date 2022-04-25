/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EQL_RULE_TYPE_ID,
  INDICATOR_RULE_TYPE_ID,
  ML_RULE_TYPE_ID,
  QUERY_RULE_TYPE_ID,
  SAVED_QUERY_RULE_TYPE_ID,
  THRESHOLD_RULE_TYPE_ID,
} from '@kbn/securitysolution-rules';

import { getFilter } from './find_rules';

const allAlertTypeIds = `(alert.attributes.alertTypeId: ${EQL_RULE_TYPE_ID}
 OR alert.attributes.alertTypeId: ${ML_RULE_TYPE_ID}
 OR alert.attributes.alertTypeId: ${QUERY_RULE_TYPE_ID}
 OR alert.attributes.alertTypeId: ${SAVED_QUERY_RULE_TYPE_ID}
 OR alert.attributes.alertTypeId: ${INDICATOR_RULE_TYPE_ID}
 OR alert.attributes.alertTypeId: ${THRESHOLD_RULE_TYPE_ID})`.replace(/[\n\r]/g, '');

describe('find_rules', () => {
  test('it returns a full filter with an AND if sent down', () => {
    expect(getFilter('alert.attributes.enabled: true')).toEqual(
      `${allAlertTypeIds} AND alert.attributes.enabled: true`
    );
  });

  test('it returns existing filter with no AND when not set [rule registry enabled: %p]', () => {
    expect(getFilter(null)).toEqual(allAlertTypeIds);
  });
});
