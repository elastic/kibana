/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  getPipelinesMock,
  getFilteredPipelinesMock,
  getSelectedPipelinesMock,
} from './helpers/pipelines_filter_list.helpers';

describe('Filtered Pipelines', () => {
  const pipelines = getPipelinesMock();

  test('should display all pipelines', () => {
    expect(getFilteredPipelinesMock(pipelines, ['on', 'on'])).toEqual(pipelines);
  });

  test('should display only managed pipelines', () => {
    const expectedResult = getSelectedPipelinesMock([0, 1]);

    expect(getFilteredPipelinesMock(pipelines, ['on', 'off'])).toEqual(expectedResult);
  });

  test('should display only not managed pipelines', () => {
    const expectedResult = getSelectedPipelinesMock([2, 3]);

    expect(getFilteredPipelinesMock(pipelines, ['off', 'on'])).toEqual(expectedResult);
  });

  test('should not display pipelines', () => {
    expect(getFilteredPipelinesMock(pipelines, ['off', 'off'])).toEqual([]);
  });
});
