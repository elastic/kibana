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
import { mockTimelineData } from '../../../../../common/mock';
import { TestProviders } from '../../../../../common/mock/test_providers';
import { getEmptyValue } from '../../../../../common/components/empty_value';
import { defaultHeaders } from '../column_headers/default_headers';

import { columnRenderers } from '.';
import { getColumnRenderer } from './get_column_renderer';
import { getValues, findItem, deleteItemIdx } from './helpers';
import { useMountAppended } from '../../../../../common/utils/use_mount_appended';
import { TimelineId } from '../../../../../../common/types/timeline';

jest.mock('../../../../../common/lib/kibana');

jest.mock('@elastic/eui', () => {
  const original = jest.requireActual('@elastic/eui');
  return {
    ...original,
    EuiScreenReaderOnly: () => <></>,
  };
});

describe('get_column_renderer', () => {
  let nonSuricata: TimelineNonEcsData[];
  const _id = mockTimelineData[0]._id;
  const mount = useMountAppended();

  beforeEach(() => {
    nonSuricata = cloneDeep(mockTimelineData[0].data);
  });

  test('renders correctly against snapshot', () => {
    const columnName = 'event.severity';
    const columnRenderer = getColumnRenderer(columnName, columnRenderers, nonSuricata);
    const column = columnRenderer.renderColumn({
      columnName,
      eventId: _id,
      values: getValues(columnName, nonSuricata),
      field: defaultHeaders[1],
      scopeId: TimelineId.test,
    });

    const wrapper = shallow(<span>{column}</span>);
    expect(wrapper).toMatchSnapshot();
  });

  test('should render event severity when dealing with data that is not suricata', () => {
    const columnName = 'event.severity';
    const columnRenderer = getColumnRenderer(columnName, columnRenderers, nonSuricata);
    const column = columnRenderer.renderColumn({
      columnName,
      eventId: _id,
      values: getValues(columnName, nonSuricata),
      field: defaultHeaders[1],
      scopeId: TimelineId.test,
    });
    const wrapper = mount(
      <TestProviders>
        <span>{column}</span>
      </TestProviders>
    );
    expect(wrapper.text()).toEqual('3');
  });

  test('should render empty value when dealing with an empty value of user', () => {
    const columnName = 'user.name';
    const idx = findItem(nonSuricata, columnName);
    nonSuricata = deleteItemIdx(nonSuricata, idx);
    const columnRenderer = getColumnRenderer(columnName, columnRenderers, nonSuricata);
    const column = columnRenderer.renderColumn({
      columnName,
      eventId: _id,
      values: getValues(columnName, nonSuricata),
      field: defaultHeaders[7],
      scopeId: TimelineId.test,
    });
    const wrapper = mount(
      <TestProviders>
        <span>{column}</span>
      </TestProviders>
    );
    expect(wrapper.text()).toEqual(getEmptyValue());
  });

  test('should render empty value when dealing with an unknown column name', () => {
    const columnName = 'something made up';
    const columnRenderer = getColumnRenderer(columnName, columnRenderers, nonSuricata);
    const column = columnRenderer.renderColumn({
      columnName,
      eventId: _id,
      values: getValues(columnName, nonSuricata),
      field: defaultHeaders[7],
      scopeId: TimelineId.test,
    });
    const wrapper = mount(
      <TestProviders>
        <span>{column}</span>
      </TestProviders>
    );
    expect(wrapper.text()).toEqual(getEmptyValue());
  });
});
