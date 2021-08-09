/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getFilter } from './find_rules';
import { SIGNALS_ID } from '../../../../common/constants';

const allAlertTypeIds = `(alert.attributes.alertTypeId: siem.eql
 OR alert.attributes.alertTypeId: siem.machine_learning
 OR alert.attributes.alertTypeId: siem.query
 OR alert.attributes.alertTypeId: siem.saved_query
 OR alert.attributes.alertTypeId: siem.threat_match
 OR alert.attributes.alertTypeId: siem.threshold)`.replace(/[\n\r]/g, '');

describe('find_rules', () => {
  const fullFilterTestCases: Array<[boolean, string]> = [
    [false, `alert.attributes.alertTypeId: ${SIGNALS_ID} AND alert.attributes.enabled: true`],
    [true, `${allAlertTypeIds} AND alert.attributes.enabled: true`],
  ];
  const nullFilterTestCases: Array<[boolean, string]> = [
    [false, `alert.attributes.alertTypeId: ${SIGNALS_ID}`],
    [true, allAlertTypeIds],
  ];

  test.each(fullFilterTestCases)(
    'it returns a full filter with an AND if sent down [rule registry enabled: %p]',
    (isRuleRegistryEnabled, expected) => {
      expect(getFilter('alert.attributes.enabled: true', isRuleRegistryEnabled)).toEqual(expected);
    }
  );

  test.each(nullFilterTestCases)(
    'it returns existing filter with no AND when not set [rule registry enabled: %p]',
    (isRuleRegistryEnabled, expected) => {
      expect(getFilter(null, isRuleRegistryEnabled)).toEqual(expected);
    }
  );
});
