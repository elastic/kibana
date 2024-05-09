/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

import type { TransformListRow } from '../../../../common';
import type { StartActionNameProps } from './start_action_name';
import { StartActionName } from './start_action_name';

import transformListRow from '../../../../common/__mocks__/transform_list_row.json';

jest.mock('../../../../../shared_imports');
jest.mock('../../../../app_dependencies');

const queryClient = new QueryClient();

describe('Transform: Transform List Actions <StartAction />', () => {
  test('Minimal initialization', () => {
    // @ts-expect-error mock data is too loosely typed
    const item: TransformListRow = transformListRow;
    const props: StartActionNameProps = {
      forceDisable: false,
      items: [item],
      transformNodes: 1,
    };

    const { container } = render(
      <QueryClientProvider client={queryClient}>
        <StartActionName {...props} />
      </QueryClientProvider>
    );
    expect(container.textContent).toBe('Start');
  });
});
