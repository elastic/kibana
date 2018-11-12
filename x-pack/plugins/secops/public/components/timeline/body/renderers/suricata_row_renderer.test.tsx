/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { mount } from 'enzyme';
import { omit } from 'lodash/fp';
import React from 'react';

import { suricataRowRenderer } from '.';
import { ECS } from '../../ecs';

describe('plain_row_renderer', () => {
  let mockData: ECS[];
  beforeEach(() => {
    mockData = [
      {
        _id: '1',
        timestamp: '2018-11-05T19:03:25.937Z',
        host: {
          hostname: 'apache',
          ip: '192.168.0.1',
        },
        event: {
          id: '1',
          category: 'Access',
          type: 'HTTP Request',
          module: 'nginx',
          severity: 3,
        },
        source: {
          ip: '192.168.0.1',
          port: 80,
        },
        destination: {
          ip: '192.168.0.3',
          port: 6343,
        },
        user: {
          id: '1',
          name: 'john.dee',
        },
        geo: {
          region_name: 'xx',
          country_iso_code: 'xx',
        },
      },
      {
        _id: '4',
        timestamp: '2018-11-08T19:03:25.937Z',
        host: {
          hostname: 'suricata',
          ip: '192.168.0.1',
        },
        event: {
          id: '4',
          category: 'Attempted Administrator Privilege Gain',
          type: 'Alert',
          module: 'suricata',
          severity: 1,
        },
        source: {
          ip: '192.168.0.3',
          port: 53,
        },
        destination: {
          ip: '192.168.0.3',
          port: 6343,
        },
        suricata: {
          eve: {
            flow_id: 4,
            proto: '',
            alert: {
              signature:
                'ET EXPLOIT NETGEAR WNR2000v5 hidden_lang_avi Stack Overflow (CVE-2016-10174)',
              signature_id: 4,
            },
          },
        },
        user: {
          id: '4',
          name: 'jenny.jones',
        },
        geo: {
          region_name: 'xx',
          country_iso_code: 'xx',
        },
      },
    ];
  });

  test('should return false if not a suricata datum', () => {
    expect(suricataRowRenderer.isInstance(mockData[0])).toBe(false);
  });

  test('should return true if it is a suricata datum', () => {
    expect(suricataRowRenderer.isInstance(mockData[1])).toBe(true);
  });

  test('should render children normally if it does not have a signature', () => {
    const children = suricataRowRenderer.renderRow(mockData[0], <span>some children</span>);
    const wrapper = mount(<span>{children}</span>);
    expect(wrapper.text()).toEqual('some children');
  });

  test('should render a suricata row', () => {
    const children = suricataRowRenderer.renderRow(mockData[1], <span>some children </span>);
    const wrapper = mount(<span>{children}</span>);
    expect(wrapper.text()).toEqual(
      'some children ET EXPLOIT NETGEAR WNR2000v5 hidden_lang_avi Stack Overflow (CVE-2016-10174)'
    );
  });

  test('should render a suricata row even if it does not have a suricata signature', () => {
    const withoutSignature = omit('suricata.eve.alert.signature', mockData[1]);
    const children = suricataRowRenderer.renderRow(withoutSignature, <span>some children</span>);
    const wrapper = mount(<span>{children}</span>);
    expect(wrapper.text()).toEqual('some children');
  });
});
