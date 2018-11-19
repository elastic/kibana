/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { mount } from 'enzyme';
import { cloneDeep, omit } from 'lodash/fp';
import React from 'react';

import { EMPTY_VALUE } from '.';
import { columnRenderers } from '.';
import { mockECSData } from '../../../../pages/mock/mock_ecs';
import { ECS } from '../../ecs';
import { getColumnRenderer } from './get_column_renderer';

describe('get_column_renderer', () => {
  let nonSuricata: ECS;
  let suricata: ECS;

  beforeEach(() => {
    nonSuricata = cloneDeep(mockECSData[0]);
    suricata = cloneDeep(mockECSData[2]);
  });

  test('should render event id when dealing with data that is not suricata', () => {
    const columnName = 'event';
    const columnRenderer = getColumnRenderer(columnName, columnRenderers, nonSuricata);
    const column = columnRenderer.renderColumn(columnName, nonSuricata);
    const wrapper = mount(<span>{column}</span>);
    expect(wrapper.text()).toEqual('1');
  });

  test('should render CVE text as the event when dealing with a suricata event', () => {
    const columnName = 'event';
    const columnRenderer = getColumnRenderer(columnName, columnRenderers, suricata);
    const column = columnRenderer.renderColumn(columnName, suricata);
    const wrapper = mount(<span>{column}</span>);
    expect(wrapper.text()).toEqual('CVE-2016-10174');
  });

  test('should render empty value when dealing with an empty value of user', () => {
    const omitUser = omit('user', nonSuricata);
    const columnName = 'user';
    const columnRenderer = getColumnRenderer(columnName, columnRenderers, omitUser);
    const column = columnRenderer.renderColumn(columnName, omitUser);
    const wrapper = mount(<span>{column}</span>);
    expect(wrapper.text()).toEqual(EMPTY_VALUE);
  });

  test('should render empty value when dealing with an unknown column name', () => {
    const columnName = 'something made up';
    const columnRenderer = getColumnRenderer(columnName, columnRenderers, nonSuricata);
    const column = columnRenderer.renderColumn(columnName, nonSuricata);
    const wrapper = mount(<span>{column}</span>);
    expect(wrapper.text()).toEqual(EMPTY_VALUE);
  });
});
