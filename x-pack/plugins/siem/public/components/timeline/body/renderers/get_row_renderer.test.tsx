/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { mount, shallow } from 'enzyme';
import toJson from 'enzyme-to-json';
import { cloneDeep } from 'lodash';
import * as React from 'react';

import { mockBrowserFields } from '../../../../containers/source/mock';
import { Ecs } from '../../../../graphql/types';
import { mockTimelineData } from '../../../../mock';
import { TestProviders } from '../../../../mock/test_providers';

import { rowRenderers } from '.';
import { getRowRenderer } from './get_row_renderer';

describe('get_column_renderer', () => {
  let nonSuricata: Ecs;
  let suricata: Ecs;

  beforeEach(() => {
    nonSuricata = cloneDeep(mockTimelineData[0].ecs);
    suricata = cloneDeep(mockTimelineData[2].ecs);
  });

  test('renders correctly against snapshot', () => {
    const rowRenderer = getRowRenderer(nonSuricata, rowRenderers);
    const row = rowRenderer.renderRow({
      browserFields: mockBrowserFields,
      data: nonSuricata,
      width: 100,
      children: <span>some child</span>,
    });

    const wrapper = shallow(<span>{row}</span>);
    expect(toJson(wrapper)).toMatchSnapshot();
  });

  test('should render plain row data when it is a non suricata row', () => {
    const rowRenderer = getRowRenderer(nonSuricata, rowRenderers);
    const row = rowRenderer.renderRow({
      browserFields: mockBrowserFields,
      data: nonSuricata,
      width: 100,
      children: <span>some child</span>,
    });
    const wrapper = mount(
      <TestProviders>
        <span>{row}</span>
      </TestProviders>
    );
    expect(wrapper.text()).toContain('some child');
  });

  test('should render a suricata row data when it is a suricata row', () => {
    const rowRenderer = getRowRenderer(suricata, rowRenderers);
    const row = rowRenderer.renderRow({
      browserFields: mockBrowserFields,
      data: suricata,
      width: 100,
      children: <span>some child </span>,
    });
    const wrapper = mount(
      <TestProviders>
        <span>{row}</span>
      </TestProviders>
    );
    expect(wrapper.text()).toContain(
      'some child 4ETEXPLOITNETGEARWNR2000v5 hidden_lang_avi Stack Overflow (CVE-2016-10174)Source192.168.0.3:53Destination192.168.0.3:6343'
    );
  });
});
