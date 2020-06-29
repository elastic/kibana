/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import mockViewBySwimlaneData from './__mocks__/mock_viewby_swimlane.json';
import { hasMatchingPoints } from './has_matching_points';

const filteredFieldsMatch = ['test@kuery-wildcard@'];
const filteredFieldsNoMatch = ['no-match@kuery-wildcard@', 'nonexistant'];

describe('hasMatchingPoints', () => {
  test('is true', () => {
    expect(
      hasMatchingPoints({
        filteredFields: filteredFieldsMatch,
        swimlaneData: mockViewBySwimlaneData,
      })
    ).toBe(true);
  });

  test('is false', () => {
    expect(
      hasMatchingPoints({
        filteredFields: filteredFieldsNoMatch,
        swimlaneData: mockViewBySwimlaneData,
      })
    ).toBe(false);
  });
});
