/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { coreWebVitalsQuery } from './core_web_vitals_query';

describe('core web vitals query', () => {
  it('fetches rum core vitals', async () => {
    expect(
      coreWebVitalsQuery(
        0,
        5000,
        '',
        {
          environment: 'ENVIRONMENT_ALL',
        },
        50
      )
    ).toMatchSnapshot();
  });
});
