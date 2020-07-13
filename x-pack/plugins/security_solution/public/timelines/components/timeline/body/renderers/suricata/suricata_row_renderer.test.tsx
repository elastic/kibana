/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { shallow } from 'enzyme';
import { cloneDeep } from 'lodash/fp';
import React from 'react';

import { mockBrowserFields } from '../../../../../../common/containers/source/mock';
import { Ecs } from '../../../../../../graphql/types';
import { mockTimelineData } from '../../../../../../common/mock';
import { TestProviders } from '../../../../../../common/mock/test_providers';
import { suricataRowRenderer } from './suricata_row_renderer';
import { useMountAppended } from '../../../../../../common/utils/use_mount_appended';

jest.mock('../../../../../../common/components/link_to');

describe('suricata_row_renderer', () => {
  const mount = useMountAppended();
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
      timelineId: 'test',
    });

    const wrapper = shallow(<span>{children}</span>);
    expect(wrapper).toMatchSnapshot();
  });

  test('should return false if not a suricata datum', () => {
    expect(suricataRowRenderer.isInstance(nonSuricata)).toBe(false);
  });

  test('should return true if it is a suricata datum', () => {
    expect(suricataRowRenderer.isInstance(suricata)).toBe(true);
  });

  test('should render a suricata row', () => {
    const children = suricataRowRenderer.renderRow({
      browserFields: mockBrowserFields,
      data: suricata,
      timelineId: 'test',
    });
    const wrapper = mount(
      <TestProviders>
        <span>{children}</span>
      </TestProviders>
    );
    expect(wrapper.text()).toContain(
      '4ETEXPLOITNETGEARWNR2000v5 hidden_lang_avi Stack Overflow (CVE-2016-10174)Source192.168.0.3:53Destination192.168.0.3:6343'
    );
  });

  test('should render a suricata row even if it does not have a suricata signature', () => {
    delete suricata!.suricata!.eve!.alert!.signature;
    const children = suricataRowRenderer.renderRow({
      browserFields: mockBrowserFields,
      data: suricata,
      timelineId: 'test',
    });
    const wrapper = mount(
      <TestProviders>
        <span>{children}</span>
      </TestProviders>
    );
    expect(wrapper.text()).toEqual('');
  });
});
