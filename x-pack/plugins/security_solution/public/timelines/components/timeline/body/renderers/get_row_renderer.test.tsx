/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { shallow } from 'enzyme';
import { cloneDeep } from 'lodash';
import React from 'react';

import { removeExternalLinkText } from '@kbn/securitysolution-io-ts-utils';
import '../../../../../common/mock/match_media';
import { mockBrowserFields } from '../../../../../common/containers/source/mock';
import { Ecs } from '../../../../../../common/ecs';
import { mockTimelineData } from '../../../../../common/mock';
import { TestProviders } from '../../../../../common/mock/test_providers';
import { useMountAppended } from '../../../../../common/utils/use_mount_appended';

import { defaultRowRenderers } from '.';
import { getRowRenderer } from './get_row_renderer';

jest.mock('../../../../../common/lib/kibana');

jest.mock('@elastic/eui', () => {
  const original = jest.requireActual('@elastic/eui');
  return {
    ...original,
    EuiScreenReaderOnly: () => <></>,
  };
});

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
    const rowRenderer = getRowRenderer(nonSuricata, defaultRowRenderers);
    const row = rowRenderer?.renderRow({
      browserFields: mockBrowserFields,
      data: nonSuricata,
      isDraggable: true,
      timelineId: 'test',
    });

    const wrapper = shallow(<span>{row}</span>);
    expect(wrapper).toMatchSnapshot();
  });

  test('should render plain row data when it is a non suricata row', () => {
    const rowRenderer = getRowRenderer(nonSuricata, defaultRowRenderers);
    const row = rowRenderer?.renderRow({
      browserFields: mockBrowserFields,
      data: nonSuricata,
      isDraggable: true,
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
    const rowRenderer = getRowRenderer(suricata, defaultRowRenderers);
    const row = rowRenderer?.renderRow({
      browserFields: mockBrowserFields,
      data: suricata,
      isDraggable: true,
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
    suricata.event = { ...suricata.event, ...{ category: ['network_traffic'] } };
    const rowRenderer = getRowRenderer(suricata, defaultRowRenderers);
    const row = rowRenderer?.renderRow({
      browserFields: mockBrowserFields,
      data: suricata,
      isDraggable: true,
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
    zeek.event = { ...zeek.event, ...{ category: ['network_traffic'] } };
    const rowRenderer = getRowRenderer(zeek, defaultRowRenderers);
    const row = rowRenderer?.renderRow({
      browserFields: mockBrowserFields,
      data: zeek,
      isDraggable: true,
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
    system.event = { ...system.event, ...{ category: ['network_traffic'] } };
    const rowRenderer = getRowRenderer(system, defaultRowRenderers);
    const row = rowRenderer?.renderRow({
      browserFields: mockBrowserFields,
      data: system,
      isDraggable: true,
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
    const rowRenderer = getRowRenderer(auditd, defaultRowRenderers);
    const row = rowRenderer?.renderRow({
      browserFields: mockBrowserFields,
      data: auditd,
      isDraggable: true,
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
