/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { shallow } from 'enzyme';
import { cloneDeep } from 'lodash';
import React from 'react';

import '../../../../../common/mock/match_media';
import { mockBrowserFields } from '../../../../../common/containers/source/mock';
import { Ecs } from '../../../../../graphql/types';
import { mockTimelineData } from '../../../../../common/mock';
import { TestProviders } from '../../../../../common/mock/test_providers';
import { useMountAppended } from '../../../../../common/utils/use_mount_appended';

import { rowRenderers } from '.';
import { getRowRenderer } from './get_row_renderer';

jest.mock('../../../../../common/components/link_to');

describe('get_column_renderer', () => {
  let nonSuricata: Ecs;
  let suricata: Ecs;
  let zeek: Ecs;
  let system: Ecs;
  let auditd: Ecs;
  const mount = useMountAppended();

  beforeEach(() => {
    nonSuricata = cloneDeep(mockTimelineData[0].ecs);
    suricata = cloneDeep(mockTimelineData[2].ecs);
    zeek = cloneDeep(mockTimelineData[13].ecs);
    system = cloneDeep(mockTimelineData[28].ecs);
    auditd = cloneDeep(mockTimelineData[19].ecs);
  });

  test('renders correctly against snapshot', () => {
    const rowRenderer = getRowRenderer(nonSuricata, rowRenderers);
    const row = rowRenderer.renderRow({
      browserFields: mockBrowserFields,
      data: nonSuricata,
      timelineId: 'test',
    });

    const wrapper = shallow(<span>{row}</span>);
    expect(wrapper).toMatchSnapshot();
  });

  test('should render plain row data when it is a non suricata row', () => {
    const rowRenderer = getRowRenderer(nonSuricata, rowRenderers);
    const row = rowRenderer.renderRow({
      browserFields: mockBrowserFields,
      data: nonSuricata,
      timelineId: 'test',
    });
    const wrapper = mount(
      <TestProviders>
        <span>{row}</span>
      </TestProviders>
    );
    expect(wrapper.text()).toEqual('');
  });

  test('should render a suricata row data when it is a suricata row', () => {
    const rowRenderer = getRowRenderer(suricata, rowRenderers);
    const row = rowRenderer.renderRow({
      browserFields: mockBrowserFields,
      data: suricata,
      timelineId: 'test',
    });
    const wrapper = mount(
      <TestProviders>
        <span>{row}</span>
      </TestProviders>
    );
    expect(wrapper.text()).toContain(
      '4ETEXPLOITNETGEARWNR2000v5 hidden_lang_avi Stack Overflow (CVE-2016-10174)Source192.168.0.3:53Destination192.168.0.3:6343'
    );
  });

  test('should render a suricata row data if event.category is network_traffic', () => {
    suricata.event = { ...suricata.event, ...{ category: ['network_traffic'] } };
    const rowRenderer = getRowRenderer(suricata, rowRenderers);
    const row = rowRenderer.renderRow({
      browserFields: mockBrowserFields,
      data: suricata,
      timelineId: 'test',
    });
    const wrapper = mount(
      <TestProviders>
        <span>{row}</span>
      </TestProviders>
    );
    expect(wrapper.text()).toContain(
      '4ETEXPLOITNETGEARWNR2000v5 hidden_lang_avi Stack Overflow (CVE-2016-10174)Source192.168.0.3:53Destination192.168.0.3:6343'
    );
  });

  test('should render a zeek row data if event.category is network_traffic', () => {
    zeek.event = { ...zeek.event, ...{ category: ['network_traffic'] } };
    const rowRenderer = getRowRenderer(zeek, rowRenderers);
    const row = rowRenderer.renderRow({
      browserFields: mockBrowserFields,
      data: zeek,
      timelineId: 'test',
    });
    const wrapper = mount(
      <TestProviders>
        <span>{row}</span>
      </TestProviders>
    );
    expect(wrapper.text()).toContain(
      'C8DRTq362Fios6hw16connectionREJSrConnection attempt rejectedtcpSource185.176.26.101:44059Destination207.154.238.205:11568'
    );
  });

  test('should render a system row data if event.category is network_traffic', () => {
    system.event = { ...system.event, ...{ category: ['network_traffic'] } };
    const rowRenderer = getRowRenderer(system, rowRenderers);
    const row = rowRenderer.renderRow({
      browserFields: mockBrowserFields,
      data: system,
      timelineId: 'test',
    });
    const wrapper = mount(
      <TestProviders>
        <span>{row}</span>
      </TestProviders>
    );
    expect(wrapper.text()).toContain(
      'Braden@zeek-londonattempted a login via(6278)with resultfailureSource128.199.212.120'
    );
  });

  test('should render a auditd row data if event.category is network_traffic', () => {
    auditd.event = { ...auditd.event, ...{ category: ['network_traffic'] } };
    const rowRenderer = getRowRenderer(auditd, rowRenderers);
    const row = rowRenderer.renderRow({
      browserFields: mockBrowserFields,
      data: auditd,
      timelineId: 'test',
    });
    const wrapper = mount(
      <TestProviders>
        <span>{row}</span>
      </TestProviders>
    );
    expect(wrapper.text()).toContain(
      'Sessionalice@zeek-sanfranin/executedgpgconf(5402)gpgconf--list-dirsagent-socketgpgconf --list-dirs agent-socket'
    );
  });
});
