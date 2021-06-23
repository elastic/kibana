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
import { mockTimelineData, TestProviders } from '../../../../../../common/mock';
import '../../../../../../common/mock/match_media';
import { useMountAppended } from '../../../../../../common/utils/use_mount_appended';
import { zeekRowRenderer } from './zeek_row_renderer';

jest.mock('../../../../../../common/lib/kibana');

jest.mock('@elastic/eui', () => {
  const original = jest.requireActual('@elastic/eui');
  return {
    ...original,
    // eslint-disable-next-line react/display-name
    EuiScreenReaderOnly: () => <></>,
  };
});

jest.mock('../../../../../../common/components/link_to');

describe('zeek_row_renderer', () => {
  const mount = useMountAppended();
  let nonZeek: Ecs;
  let zeek: Ecs;

  beforeEach(() => {
    nonZeek = cloneDeep(mockTimelineData[0].ecs);
    zeek = cloneDeep(mockTimelineData[13].ecs);
  });

  test('renders correctly against snapshot', () => {
    const children = zeekRowRenderer.renderRow({
      browserFields: mockBrowserFields,
      data: nonZeek,
      timelineId: 'test',
    });

    const wrapper = shallow(<span>{children}</span>);
    expect(wrapper).toMatchSnapshot();
  });

  test('should return false if not a zeek datum', () => {
    expect(zeekRowRenderer.isInstance(nonZeek)).toBe(false);
  });

  test('should return true if it is a suricata datum', () => {
    expect(zeekRowRenderer.isInstance(zeek)).toBe(true);
  });

  test('should render a zeek row', () => {
    const children = zeekRowRenderer.renderRow({
      browserFields: mockBrowserFields,
      data: zeek,
      timelineId: 'test',
    });
    const wrapper = mount(
      <TestProviders>
        <span>{children}</span>
      </TestProviders>
    );
    expect(removeExternalLinkText(wrapper.text())).toContain(
      'C8DRTq362Fios6hw16connectionREJSrConnection attempt rejectedtcpSource185.176.26.101:44059Destination207.154.238.205:11568'
    );
  });
});
