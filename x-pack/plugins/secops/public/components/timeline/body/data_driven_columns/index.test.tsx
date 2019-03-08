/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { mount } from 'enzyme';
import toJson from 'enzyme-to-json';

import * as React from 'react';

import { mockEcsData } from '../../../../mock';
import { TestProviders } from '../../../../mock/test_providers';
import { defaultHeaders } from '../column_headers/default_headers';
import { columnRenderers } from '../renderers';

import { DataDrivenColumns } from '.';

describe('Columns', () => {
  const headersSansTimestamp = defaultHeaders.filter(h => h.id !== '@timestamp');

  test('it renders the expected columns', () => {
    const wrapper = mount(
      <TestProviders>
        <DataDrivenColumns
          columnHeaders={headersSansTimestamp}
          columnRenderers={columnRenderers}
          ecs={mockEcsData[0]}
          onColumnResized={jest.fn()}
        />
      </TestProviders>
    );

    expect(toJson(wrapper)).toMatchSnapshot();
  });
});
