/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getInfluencersHtmlString, getResultsForJobId } from './util';
import {
  mlResultsServiceMock,
  typicalExpected,
  actualExpected,
  typicalToActualExpected,
} from './results.test.mock';

describe('Maps util', () => {
  describe('getInfluencersHtmlString', () => {
    const splitField = 'split_field_influencer';
    const valueFour = 'value_four';
    const influencerFour = 'influencer_four';
    const influencers = [
      {
        influencer_field_name: 'influencer_one',
        influencer_field_values: ['value_one', 'value_two', 'value_three', valueFour],
      },
      {
        influencer_field_name: 'influencer_two',
        influencer_field_values: ['value_one', 'value_two', 'value_three', valueFour],
      },
      {
        influencer_field_name: splitField,
        influencer_field_values: ['value_one', 'value_two'],
      },
      {
        influencer_field_name: 'influencer_three',
        influencer_field_values: ['value_one', 'value_two', 'value_three', valueFour],
      },
      {
        influencer_field_name: influencerFour,
        influencer_field_values: ['value_one', 'value_two', 'value_three', valueFour],
      },
    ];

    test('should create the html string when given an array of influencers', () => {
      const expected =
        '<ul><li>influencer_one: value_one, value_two, value_three</li><li>influencer_two: value_one, value_two, value_three</li><li>influencer_three: value_one, value_two, value_three</li></ul>';
      const actual = getInfluencersHtmlString(influencers, splitField);
      expect(actual).toBe(expected);
      // Should not include split field
      expect(actual.includes(splitField)).toBe(false);
      // should limit to the first three influencer values
      expect(actual.includes(valueFour)).toBe(false);
      // should limit to the first three influencer names
      expect(actual.includes(influencerFour)).toBe(false);
    });
  });

  describe('getResultsForJobId', () => {
    const jobId = 'jobId';
    const searchFilters = {
      timeFilters: { from: 'now-2y', to: 'now' },
      query: { language: 'kuery', query: '' },
    };

    test('should get map features from job anomalies results for typical layer', async () => {
      const actual = await getResultsForJobId(
        mlResultsServiceMock,
        jobId,
        'typical',
        searchFilters
      );
      expect(actual).toEqual(typicalExpected);
    });

    test('should get map features from job anomalies results for actual layer', async () => {
      const actual = await getResultsForJobId(mlResultsServiceMock, jobId, 'actual', searchFilters);
      expect(actual).toEqual(actualExpected);
    });

    test('should get map features from job anomalies results for "typical to actual" layer', async () => {
      const actual = await getResultsForJobId(
        mlResultsServiceMock,
        jobId,
        'typical to actual',
        searchFilters
      );
      expect(actual).toEqual(typicalToActualExpected);
    });
  });
});
