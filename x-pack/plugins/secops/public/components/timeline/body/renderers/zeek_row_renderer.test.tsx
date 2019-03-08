/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { mount } from 'enzyme';
import { cloneDeep } from 'lodash/fp';
import * as React from 'react';

import { Ecs } from '../../../../graphql/types';
import { mockEcsData, TestProviders } from '../../../../mock';

import { zeekRowRenderer } from '.';

describe('zeek_row_renderer', () => {
  let nonZeek: Ecs;
  let zeek: Ecs;

  beforeEach(() => {
    nonZeek = cloneDeep(mockEcsData[0]);
    zeek = cloneDeep(mockEcsData[13]);
  });

  test('should return false if not a zeek datum', () => {
    expect(zeekRowRenderer.isInstance(nonZeek)).toBe(false);
  });

  test('should return true if it is a suricata datum', () => {
    expect(zeekRowRenderer.isInstance(zeek)).toBe(true);
  });

  test('should render children normally if it does not have a zeek object', () => {
    const children = zeekRowRenderer.renderRow({
      data: nonZeek,
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

  test('should render a zeek row', () => {
    const children = zeekRowRenderer.renderRow({
      data: zeek,
      width: 100,
      children: <span>some children </span>,
    });
    const wrapper = mount(
      <TestProviders>
        <span>{children}</span>
      </TestProviders>
    );
    expect(wrapper.text()).toContain(
      'some children C8DRTq362Fios6hw16connectionREJSrConnection attempt rejectedSource185.176.26.101:44059Destination207.154.238.205:11568'
    );
  });
});
