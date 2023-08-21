/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { shallow } from 'enzyme';
import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

import { TransformList } from './transform_list';

jest.mock('../../../../../shared_imports');
jest.mock('../../../../app_dependencies');

describe('Transform: Transform List <TransformList />', () => {
  test('Minimal initialization', () => {
    const queryClient = new QueryClient();
    const wrapper = shallow(
      <QueryClientProvider client={queryClient}>
        <TransformList
          errorMessage={''}
          isLoading={false}
          onCreateTransform={jest.fn()}
          transformNodes={1}
          transforms={[]}
          transformsLoading={false}
        />
      </QueryClientProvider>
    );

    expect(wrapper).toMatchSnapshot();
  });
});
