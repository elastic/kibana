/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { mount, shallow } from 'enzyme';
import { cloneDeep } from 'lodash';
import React from 'react';
import { ThemeProvider } from 'styled-components';

import type { TimelineNonEcsData } from '../../../../../../common/search_strategy/timeline';
import { defaultHeaders, mockTimelineData } from '../../../../../common/mock';
import { getEmptyValue } from '../../../../../common/components/empty_value';
import { unknownColumnRenderer } from './unknown_column_renderer';
import { getValues } from './helpers';
import { getMockTheme } from '../../../../../common/lib/kibana/kibana_react.mock';
import { TimelineId } from '../../../../../../common/types';

const mockTheme = getMockTheme({
  eui: {
    euiColorMediumShade: '#ece',
  },
});

describe('unknown_column_renderer', () => {
  let mockDatum: TimelineNonEcsData[];
  const _id = mockTimelineData[0]._id;
  beforeEach(() => {
    mockDatum = cloneDeep(mockTimelineData[0].data);
  });

  test('renders correctly against snapshot', () => {
    const emptyColumn = unknownColumnRenderer.renderColumn({
      columnName: '@timestamp',
      eventId: _id,
      values: getValues('@timestamp', mockDatum),
      field: defaultHeaders.find((h) => h.id === '@timestamp')!,
      scopeId: TimelineId.test,
    });
    const wrapper = shallow(<span>{emptyColumn}</span>);
    expect(wrapper).toMatchSnapshot();
  });

  test('should return isInstance true with a made up column name', () => {
    expect(unknownColumnRenderer.isInstance('a made up column name', mockDatum)).toBe(true);
  });

  test('should return an empty value with a made up column name that does not have a valid data value', () => {
    const emptyColumn = unknownColumnRenderer.renderColumn({
      columnName: 'a made up column name',
      eventId: _id,
      values: getValues('a made up column name', mockDatum),
      field: defaultHeaders.find((h) => h.id === 'a made up column name')!,
      scopeId: TimelineId.test,
    });
    const wrapper = mount(
      <ThemeProvider theme={mockTheme}>
        <span>{emptyColumn}</span>
      </ThemeProvider>
    );
    expect(wrapper.text()).toEqual(getEmptyValue());
  });

  test('should return an empty value with a column name that has valid id value', () => {
    const emptyColumn = unknownColumnRenderer.renderColumn({
      columnName: '@timestamp',
      eventId: _id,
      values: getValues('@timestamp', mockDatum),
      field: defaultHeaders.find((h) => h.id === '@timestamp')!,
      scopeId: TimelineId.test,
    });
    const wrapper = mount(
      <ThemeProvider theme={mockTheme}>
        <span>{emptyColumn}</span>
      </ThemeProvider>
    );
    expect(wrapper.text()).toEqual(getEmptyValue());
  });
});
