/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { shallow } from 'enzyme';
import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

import { CreateTransformButton } from './create_transform_button';

jest.mock('../../../../../shared_imports');

const queryClient = new QueryClient();

describe('Transform: Transform List <CreateTransformButton />', () => {
  test('Minimal initialization', () => {
    const wrapper = shallow(
      <QueryClientProvider client={queryClient}>
        <CreateTransformButton onClick={jest.fn()} transformNodes={1} />
      </QueryClientProvider>
    );

    expect(wrapper).toMatchSnapshot();
  });
});
