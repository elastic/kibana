/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { shallow } from 'enzyme';
import { cloneDeep } from 'lodash/fp';
import React from 'react';

import { removeExternalLinkText } from '@kbn/securitysolution-io-ts-utils';
import { mockBrowserFields } from '../../../../../../common/containers/source/mock';
import { Ecs } from '../../../../../../../common/ecs';
import { mockTimelineData } from '../../../../../../common/mock';
import '../../../../../../common/mock/match_media';
import { TestProviders } from '../../../../../../common/mock/test_providers';
import { suricataRowRenderer } from './suricata_row_renderer';
import { useMountAppended } from '../../../../../../common/utils/use_mount_appended';

jest.mock('../../../../../../common/lib/kibana');

jest.mock('@elastic/eui', () => {
  const original = jest.requireActual('@elastic/eui');
  return {
    ...original,
    EuiScreenReaderOnly: () => <></>,
  };
});

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
      isDraggable: true,
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
      isDraggable: true,
      timelineId: 'test',
    });
    const wrapper = mount(
      <TestProviders>
        <span>{children}</span>
      </TestProviders>
    );
    expect(removeExternalLinkText(wrapper.text())).toContain(
      '4ETEXPLOITNETGEARWNR2000v5 hidden_lang_avi Stack Overflow (CVE-2016-10174)Source192.168.0.3:53Destination192.168.0.3:6343'
    );
  });

  test('should render a suricata row even if it does not have a suricata signature', () => {
    delete suricata?.suricata?.eve?.alert?.signature;
    const children = suricataRowRenderer.renderRow({
      browserFields: mockBrowserFields,
      data: suricata,
      isDraggable: true,
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
