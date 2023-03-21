/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getQueryStringForInfluencers } from './get_query_string_for_influencers';

const entityName = 'key_two';
const influencers = [
  { key_one: 'value_one' },
  { [entityName]: 'value_two' },
  { key_three: 'value_three' },
];
const allInfluencersString = 'key_one: value_one or key_two: value_two or key_three: value_three';

describe('getQueryStringForInfluencers', () => {
  describe('when entityName is not present', () => {
    test('returns empty string when there are no influencers', () => {
      const actual = getQueryStringForInfluencers([]);
      expect(actual).toBe('');
    });

    test('returns OR query with all influencer key values', () => {
      const actual = getQueryStringForInfluencers(influencers);
      expect(actual).toBe(allInfluencersString);
    });
  });

  describe('when entityName is present', () => {
    test('returns empty string when there are no influencers', () => {
      const actual = getQueryStringForInfluencers([], entityName);
      expect(actual).toBe('');
    });

    test('returns empty string when there is only one influencer and it matches the entityName', () => {
      const actual = getQueryStringForInfluencers([{ [entityName]: 'value_two' }], entityName);
      expect(actual).toBe('');
    });

    test('when entityName does not match any influencers returns OR query with all influencer key values', () => {
      const actual = getQueryStringForInfluencers(influencers, 'otherEntityName');
      expect(actual).toBe(allInfluencersString);
    });

    test('when entityName matches an influencer, returns OR query with all influencer key values except influencer matching entityName', () => {
      const expectedWithAllInfluencers = 'key_one: value_one or key_three: value_three';
      const actualWithAllInfluencers = getQueryStringForInfluencers(influencers, entityName);
      expect(actualWithAllInfluencers).toBe(expectedWithAllInfluencers);

      const expectedWithTwoInfluencers = 'key_one: value_one';
      const actualWithTwoInfluencers = getQueryStringForInfluencers(
        [{ key_one: 'value_one' }, { [entityName]: 'value_two' }],
        entityName
      );
      expect(actualWithTwoInfluencers).toBe(expectedWithTwoInfluencers);
    });
  });
});
