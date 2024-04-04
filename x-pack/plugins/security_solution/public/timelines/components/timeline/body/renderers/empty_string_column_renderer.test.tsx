/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { shallow } from 'enzyme';
import { cloneDeep } from 'lodash/fp';
import React from 'react';

import type { TimelineNonEcsData } from '../../../../../../common/search_strategy/timeline';
import { defaultHeaders, mockTimelineData } from '../../../../../common/mock';
import '../../../../../common/mock/match_media';
import { emptyStringColumnRenderer } from './empty_string_column_renderer';

jest.mock('../../../../../common/lib/kibana');

describe('empty_string_column_renderer', () => {
  let mockDatum: TimelineNonEcsData[];
  const _id = mockTimelineData[0]._id;

  beforeEach(() => {
    mockDatum = cloneDeep(mockTimelineData[32].data);
  });

  test('should return isInstance true if host.name is an array of empty strings', () => {
    expect(emptyStringColumnRenderer.isInstance('host.name', mockDatum)).toBe(true);
  });

  test('should return isInstance true if host.name is NOT an array of empty strings', () => {
    expect(emptyStringColumnRenderer.isInstance('source.ip', mockDatum)).toBe(false);
  });

  test('renders correctly against snapshot', () => {
    const emptyColumn = emptyStringColumnRenderer.renderColumn({
      columnName: 'host.name',
      eventId: _id,
      values: [''],
      field: defaultHeaders.find((h) => h.id === 'host.name')!,
      scopeId: 'test',
    });
    const wrapper = shallow(<span>{emptyColumn}</span>);
    expect(wrapper).toMatchSnapshot();
  });
});
