/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { mount, shallow } from 'enzyme';
import toJson from 'enzyme-to-json';
import { cloneDeep } from 'lodash/fp';
import * as React from 'react';

import { mockBrowserFields } from '../../../../../containers/source/mock';
import { Ecs } from '../../../../../graphql/types';
import { mockTimelineData } from '../../../../../mock';
import { TestProviders } from '../../../../../mock/test_providers';
import { suricataRowRenderer } from './suricata_row_renderer';

describe('suricata_row_renderer', () => {
  let nonSuricata: Ecs;
  let suricata: Ecs;

  beforeEach(() => {
    nonSuricata = cloneDeep(mockTimelineData[0].ecs);
    suricata = cloneDeep(mockTimelineData[2].ecs);
  });

  test('renders correctly against snapshot', () => {
    const children = suricataRowRenderer.renderRow({
      browserFields: mockBrowserFields,
      data: nonSuricata,
      width: 100,
      children: <span>some children</span>,
    });

    const wrapper = shallow(<span>{children}</span>);
    expect(toJson(wrapper)).toMatchSnapshot();
  });

  test('should return false if not a suricata datum', () => {
    expect(suricataRowRenderer.isInstance(nonSuricata)).toBe(false);
  });

  test('should return true if it is a suricata datum', () => {
    expect(suricataRowRenderer.isInstance(suricata)).toBe(true);
  });

  test('should render children normally if it does not have a signature', () => {
    const children = suricataRowRenderer.renderRow({
      browserFields: mockBrowserFields,
      data: nonSuricata,
      width: 100,
      children: <span>some children</span>,
    });
    const wrapper = mount(
      <TestProviders>
        <span>{children}</span>
      </TestProviders>
    );
    expect(wrapper.text()).toEqual('some children');
  });

  test('should render a suricata row', () => {
    const children = suricataRowRenderer.renderRow({
      browserFields: mockBrowserFields,
      data: suricata,
      width: 100,
      children: <span>some children </span>,
    });
    const wrapper = mount(
      <TestProviders>
        <span>{children}</span>
      </TestProviders>
    );
    expect(wrapper.text()).toContain(
      'some children 4ETEXPLOITNETGEARWNR2000v5 hidden_lang_avi Stack Overflow (CVE-2016-10174)Source192.168.0.3:53Destination192.168.0.3:6343'
    );
  });

  test('should render a suricata row even if it does not have a suricata signature', () => {
    delete suricata!.suricata!.eve!.alert!.signature;
    const children = suricataRowRenderer.renderRow({
      browserFields: mockBrowserFields,
      data: suricata,
      width: 100,
      children: <span>some children</span>,
    });
    const wrapper = mount(
      <TestProviders>
        <span>{children}</span>
      </TestProviders>
    );
    expect(wrapper.text()).toEqual('some children');
  });
});
