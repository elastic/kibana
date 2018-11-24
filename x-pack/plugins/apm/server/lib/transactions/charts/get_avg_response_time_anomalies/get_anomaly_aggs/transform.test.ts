/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { mainBucketsResponse } from '../mock-responses/mainBucketsResponse';
import { anomalyAggsTransform } from './transform';

describe('anomalyAggsTransform', () => {
  it('should return null if response is empty', () => {
    expect(anomalyAggsTransform(null)).toBe(null);
  });

  it('should match snapshot', () => {
    expect(anomalyAggsTransform(mainBucketsResponse)).toMatchSnapshot();
  });
});
