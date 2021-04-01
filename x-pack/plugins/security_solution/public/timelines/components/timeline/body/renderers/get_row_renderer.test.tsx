/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { shallow } from 'enzyme';
import React from 'react';

import { removeExternalLinkText } from '../../../../../../common/test_utils';
import '../../../../../common/mock/match_media';
import { mockBrowserFields } from '../../../../../common/containers/source/mock';
import { mockTimelineData } from '../../../../../common/mock';
import { TimelineItem } from '../../../../../../common/search_strategy';
import { TestProviders } from '../../../../../common/mock/test_providers';
import { useMountAppended } from '../../../../../common/utils/use_mount_appended';

import { defaultRowRenderers } from '.';
import { getRowRenderer } from './get_row_renderer';

jest.mock('@elastic/eui', () => {
  const original = jest.requireActual('@elastic/eui');
  return {
    ...original,
    // eslint-disable-next-line react/display-name
    EuiScreenReaderOnly: () => <></>,
  };
});

jest.mock('../../../../../common/components/link_to');

describe('get_column_renderer', () => {
  let nonSuricata: TimelineItem;
  let suricata: TimelineItem;
  let zeek: TimelineItem;
  let system: TimelineItem;
  let auditd: TimelineItem;
  const mount = useMountAppended();

  beforeEach(() => {
    nonSuricata = mockTimelineData[0];
    suricata = mockTimelineData[2];
    zeek = mockTimelineData[13];
    system = mockTimelineData[28];
    auditd = mockTimelineData[19];
  });

  test('renders correctly against snapshot', () => {
    const rowRenderer = getRowRenderer(defaultRowRenderers, nonSuricata.ecs, nonSuricata.data);
    const row = rowRenderer?.renderRow({
      browserFields: mockBrowserFields,
      data: nonSuricata.ecs,
      timelineId: 'test',
    });

    const wrapper = shallow(<span>{row}</span>);
    expect(wrapper).toMatchSnapshot();
  });

  test('should render plain row data when it is a non suricata row', () => {
    const rowRenderer = getRowRenderer(defaultRowRenderers, nonSuricata.ecs, nonSuricata.data);
    const row = rowRenderer?.renderRow({
      browserFields: mockBrowserFields,
      data: nonSuricata.ecs,
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
    const rowRenderer = getRowRenderer(defaultRowRenderers, suricata.ecs, suricata.data);
    const row = rowRenderer?.renderRow({
      browserFields: mockBrowserFields,
      data: suricata.ecs,
      timelineId: 'test',
    });
    const wrapper = mount(
      <TestProviders>
        <span>{row}</span>
      </TestProviders>
    );
    expect(removeExternalLinkText(wrapper.text())).toContain(
      '4ETEXPLOITNETGEARWNR2000v5 hidden_lang_avi Stack Overflow (CVE-2016-10174)Source192.168.0.3:53Destination192.168.0.3:6343'
    );
  });

  test('should render a suricata row data if event.category is network_traffic', () => {
    suricata.ecs.event = { ...suricata.ecs.event, ...{ category: ['network_traffic'] } };
    const rowRenderer = getRowRenderer(defaultRowRenderers, suricata.ecs, suricata.data);
    const row = rowRenderer?.renderRow({
      browserFields: mockBrowserFields,
      data: suricata.ecs,
      timelineId: 'test',
    });
    const wrapper = mount(
      <TestProviders>
        <span>{row}</span>
      </TestProviders>
    );
    expect(removeExternalLinkText(wrapper.text())).toContain(
      '4ETEXPLOITNETGEARWNR2000v5 hidden_lang_avi Stack Overflow (CVE-2016-10174)Source192.168.0.3:53Destination192.168.0.3:6343'
    );
  });

  test('should render a zeek row data if event.category is network_traffic', () => {
    zeek.ecs.event = { ...zeek.ecs.event, ...{ category: ['network_traffic'] } };
    const rowRenderer = getRowRenderer(defaultRowRenderers, zeek.ecs, zeek.data);
    const row = rowRenderer?.renderRow({
      browserFields: mockBrowserFields,
      data: zeek.ecs,
      timelineId: 'test',
    });
    const wrapper = mount(
      <TestProviders>
        <span>{row}</span>
      </TestProviders>
    );
    expect(removeExternalLinkText(wrapper.text())).toContain(
      'C8DRTq362Fios6hw16connectionREJSrConnection attempt rejectedtcpSource185.176.26.101:44059Destination207.154.238.205:11568'
    );
  });

  test('should render a system row data if event.category is network_traffic', () => {
    system.ecs.event = { ...system.ecs.event, ...{ category: ['network_traffic'] } };
    const rowRenderer = getRowRenderer(defaultRowRenderers, system.ecs, system.data);
    const row = rowRenderer?.renderRow({
      browserFields: mockBrowserFields,
      data: system.ecs,
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
    auditd.ecs.event = { ...auditd.ecs.event, ...{ category: ['network_traffic'] } };
    const rowRenderer = getRowRenderer(defaultRowRenderers, auditd.ecs, auditd.data);
    const row = rowRenderer?.renderRow({
      browserFields: mockBrowserFields,
      data: auditd.ecs,
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
