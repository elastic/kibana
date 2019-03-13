/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { mount, shallow } from 'enzyme';
import toJson from 'enzyme-to-json';
import { cloneDeep, get } from 'lodash/fp';
import * as React from 'react';

import { Ecs } from '../../../../graphql/types';
import { mockEcsData } from '../../../../mock';
import { TestProviders } from '../../../../mock/test_providers';
import { getEmptyValue } from '../../../empty_value';
import { defaultHeaders } from '../column_headers/default_headers';

import { columnRenderers } from '.';
import { getColumnRenderer } from './get_column_renderer';

describe('get_column_renderer', () => {
  let nonSuricata: Ecs;

  beforeEach(() => {
    nonSuricata = cloneDeep(mockEcsData[0]);
  });

  test('renders correctly against snapshot', () => {
    const columnName = 'event.id';
    const columnRenderer = getColumnRenderer(columnName, columnRenderers, nonSuricata);
    const column = columnRenderer.renderColumn({
      columnName,
      eventId: nonSuricata._id,
      value: get(columnName, nonSuricata),
      field: defaultHeaders[1],
    });

    const wrapper = shallow(<span>{column}</span>);
    expect(toJson(wrapper)).toMatchSnapshot();
  });

  test('should render event severity when dealing with data that is not suricata', () => {
    const columnName = 'event.severity';
    const columnRenderer = getColumnRenderer(columnName, columnRenderers, nonSuricata);
    const column = columnRenderer.renderColumn({
      columnName,
      eventId: nonSuricata._id,
      value: get(columnName, nonSuricata),
      field: defaultHeaders[1],
    });
    const wrapper = mount(
      <TestProviders>
        <span>{column}</span>
      </TestProviders>
    );
    expect(wrapper.text()).toEqual('3');
  });

  test('should render empty value when dealing with an empty value of user', () => {
    delete nonSuricata.user;
    const columnName = 'user.name';
    const columnRenderer = getColumnRenderer(columnName, columnRenderers, nonSuricata);
    const column = columnRenderer.renderColumn({
      columnName,
      eventId: nonSuricata._id,
      value: get(columnName, nonSuricata),
      field: defaultHeaders[7],
    });
    const wrapper = mount(<span>{column}</span>);
    expect(wrapper.text()).toEqual(getEmptyValue());
  });

  test('should render empty value when dealing with an unknown column name', () => {
    const columnName = 'something made up';
    const columnRenderer = getColumnRenderer(columnName, columnRenderers, nonSuricata);
    const column = columnRenderer.renderColumn({
      columnName,
      eventId: nonSuricata._id,
      value: get(columnName, nonSuricata),
      field: defaultHeaders[7],
    });
    const wrapper = mount(<span>{column}</span>);
    expect(wrapper.text()).toEqual(getEmptyValue());
  });
});
