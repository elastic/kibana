/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React from 'react';
import { render } from '../../test/test_utils';
import { ElasticsearchOverview as Overview } from './overview';

describe('<Overview />', () => {
  test('renders without throwing an error', () => {
    const wrapper = render(<Overview />);
    expect(wrapper).toBeDefined();
  });

  test.todo('getting started');
  test.todo('select client');
  test.todo('install client');
  test.todo('api key');
  test.todo('configure client');
  test.todo('test connection');
  test.todo('ingest data');
  test.todo('build query');
  test.todo("what's next?");
});
