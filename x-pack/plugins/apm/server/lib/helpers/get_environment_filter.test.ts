/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { getEnvironmentFilter } from './get_environment_filter';
import { ENVIRONMENT_NOT_DEFINED } from '../../../common/environment_filter_values';
import { SERVICE_ENVIRONMENT } from '../../../common/elasticsearch_fieldnames';

describe('getEnvironmentFilter', () => {
  it('should return empty array, when environment is undefined', () => {
    const filter = getEnvironmentFilter();
    expect(filter).toHaveLength(0);
  });

  it('should create a filter for a service environment', () => {
    const filter = getEnvironmentFilter('test');
    expect(filter).toHaveLength(1);
    expect(filter[0]).toHaveProperty(['term', SERVICE_ENVIRONMENT], 'test');
  });

  it('should create a filter for missing service environments', () => {
    const filter = getEnvironmentFilter(ENVIRONMENT_NOT_DEFINED.value);
    expect(filter).toHaveLength(1);
    expect(filter[0]).toHaveProperty(
      ['bool', 'must_not', 'exists', 'field'],
      SERVICE_ENVIRONMENT
    );
  });
});
