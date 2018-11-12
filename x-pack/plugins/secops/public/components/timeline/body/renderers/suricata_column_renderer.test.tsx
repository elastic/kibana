/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { mount } from 'enzyme';
import { omit, set } from 'lodash/fp';
import React from 'react';

import { EMPTY_VALUE, suricataColumnRenderer } from '.';
import { ECS } from '../../ecs';

describe('suricata_column_renderer', () => {
  let mockDatum: ECS;
  beforeEach(() => {
    mockDatum = {
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
    };
  });

  test('should return isInstance of false if event is empty', () => {
    const missingSource = omit('event', mockDatum);
    expect(suricataColumnRenderer.isInstance('event', missingSource)).toBe(false);
  });

  test('should return isInstance of false if event module is empty', () => {
    const missingSource = omit('event.module', mockDatum);
    expect(suricataColumnRenderer.isInstance('event', missingSource)).toBe(false);
  });

  test('should return isInstance of false if event module does not equal suricata', () => {
    mockDatum.event.module = 'some other value';
    expect(suricataColumnRenderer.isInstance('event', mockDatum)).toBe(false);
  });

  test('should return isInstance true if event is NOT empty and module equals suricata', () => {
    expect(suricataColumnRenderer.isInstance('event', mockDatum)).toBe(true);
  });

  test('should return isInstance true if event is NOT empty and module equals SurICaTA', () => {
    mockDatum.event.module = 'SurICaTA';
    expect(suricataColumnRenderer.isInstance('event', mockDatum)).toBe(true);
  });

  test('should return a value of the CVE if event has a valid suricata value and it is a CVE', () => {
    const column = suricataColumnRenderer.renderColumn('event', mockDatum);
    const wrapper = mount(<span>{column}</span>);
    expect(wrapper.text()).toEqual('CVE-2016-10174');
  });

  test('should return a value of the event id if no CVE is in the event', () => {
    const dataumWithValue = set(
      'suricata.eve.alert.signature',
      'Something without a CVE entry inside of it',
      mockDatum
    );
    const column = suricataColumnRenderer.renderColumn('event', dataumWithValue);
    const wrapper = mount(<span>{column}</span>);
    expect(wrapper.text()).toEqual('4');
  });

  test('should return a value of the empty if no CVE is in the event and the event does not have an id', () => {
    const missingSignature = omit('suricata.eve.alert.signature', mockDatum);
    const missingEventIdAndSignature = omit('event.id', missingSignature);
    const column = suricataColumnRenderer.renderColumn('event', missingEventIdAndSignature);
    const wrapper = mount(<span>{column}</span>);
    expect(wrapper.text()).toEqual(EMPTY_VALUE);
  });

  test('should return a value if an unknown column name is sent in', () => {
    const column = suricataColumnRenderer.renderColumn('made up column name', mockDatum);
    const wrapper = mount(<span>{column}</span>);
    expect(wrapper.text()).toEqual(EMPTY_VALUE);
  });
});
