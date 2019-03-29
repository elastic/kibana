/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { mount } from 'enzyme';
import toJson from 'enzyme-to-json';
import * as React from 'react';
import AutonomousSystem = GetIpOverviewQuery.AutonomousSystem;
import { mountWithIntl } from 'test_utils/enzyme_helpers';

import { GetIpOverviewQuery, HostEcsFields, IpOverviewType } from '../../../../graphql/types';
import { TestProviders } from '../../../../mock';

import {
  autonomousSystemRenderer,
  dateRenderer,
  hostNameRenderer,
  locationRenderer,
  whoisRenderer,
} from './field_renderers';
import { mockData } from './mock';

describe('Field Renderers', () => {
  describe('#locationRenderer', () => {
    test('it renders correctly against snapshot', () => {
      const wrapper = mount(
        <TestProviders>
          {locationRenderer(['source.geo.city_name', 'source.geo.region_name'], mockData.complete)}
        </TestProviders>
      );

      expect(toJson(wrapper)).toMatchSnapshot();
    });

    test('it renders emptyTagValue when no fields provided', () => {
      const wrapper = mount(
        <TestProviders>{locationRenderer([], mockData.complete)}</TestProviders>
      );
      expect(wrapper.text()).toEqual('--');
    });

    test('it renders emptyTagValue when invalid fields provided', () => {
      const wrapper = mount(
        <TestProviders>
          {locationRenderer(['source.geo.my_house'], mockData.complete)}
        </TestProviders>
      );
      expect(wrapper.text()).toEqual('--');
    });
  });

  describe('#dateRenderer', () => {
    test('it renders correctly against snapshot', () => {
      const wrapper = mount(
        <TestProviders>{dateRenderer('firstSeen', mockData.complete.source!)}</TestProviders>
      );

      expect(toJson(wrapper)).toMatchSnapshot();
    });

    test('it renders emptyTagValue when non-string fieldprovided', () => {
      const wrapper = mount(
        <TestProviders>{dateRenderer('geo.location.lat', mockData.complete.source!)}</TestProviders>
      );
      expect(wrapper.text()).toEqual('--');
    });

    test('it renders emptyTagValue when invalid field provided', () => {
      const wrapper = mount(
        <TestProviders>{dateRenderer('geo.spark_plug', mockData.complete.source!)}</TestProviders>
      );
      expect(wrapper.text()).toEqual('--');
    });
  });

  describe('#autonomousSystemRenderer', () => {
    const emptyMock: AutonomousSystem = { as_org: null, asn: null, ip: '10.10.10.10' };
    const halfEmptyMock: AutonomousSystem = { as_org: null, asn: 'Test ASN', ip: '10.10.10.10' };

    test('it renders correctly against snapshot', () => {
      const wrapper = mount(
        <TestProviders>
          {autonomousSystemRenderer(
            mockData.complete.source!.autonomousSystem!,
            IpOverviewType.source
          )}
        </TestProviders>
      );

      expect(toJson(wrapper)).toMatchSnapshot();
    });

    test('it renders emptyTagValue when non-string field provided', () => {
      const wrapper = mount(
        <TestProviders>
          {autonomousSystemRenderer(halfEmptyMock, IpOverviewType.source)}
        </TestProviders>
      );
      expect(wrapper.text()).toEqual('--');
    });

    test('it renders emptyTagValue when invalid field provided', () => {
      const wrapper = mount(
        <TestProviders>{autonomousSystemRenderer(emptyMock, IpOverviewType.source)}</TestProviders>
      );
      expect(wrapper.text()).toEqual('--');
    });
  });

  describe('#hostIdRenderer', () => {
    const emptyIdHost: Partial<HostEcsFields> = {
      name: 'test',
      id: null,
      ip: ['10.10.10.10'],
    };
    const emptyIpHost: Partial<HostEcsFields> = {
      name: 'test',
      id: 'test',
      ip: null,
    };
    test('it renders correctly against snapshot', () => {
      const wrapper = mount(
        <TestProviders>
          {hostNameRenderer(mockData.complete.source!.host!, '10.10.10.10')}
        </TestProviders>
      );

      expect(toJson(wrapper)).toMatchSnapshot();
    });

    test('it renders emptyTagValue when non-matching IP is provided', () => {
      const wrapper = mount(
        <TestProviders>
          {hostNameRenderer(mockData.complete.source!.host!, '10.10.10.11')}
        </TestProviders>
      );
      expect(wrapper.text()).toEqual('--');
    });

    test('it renders emptyTagValue when no host.id is provided', () => {
      const wrapper = mount(
        <TestProviders>{hostNameRenderer(emptyIdHost, IpOverviewType.source)}</TestProviders>
      );
      expect(wrapper.text()).toEqual('--');
    });
    test('it renders emptyTagValue when no host.ip is provided', () => {
      const wrapper = mount(
        <TestProviders>{hostNameRenderer(emptyIpHost, IpOverviewType.source)}</TestProviders>
      );
      expect(wrapper.text()).toEqual('--');
    });
  });

  describe('#hostNameRenderer', () => {
    const emptyIdHost: Partial<HostEcsFields> = {
      name: 'test',
      id: null,
      ip: ['10.10.10.10'],
    };
    const emptyIpHost: Partial<HostEcsFields> = {
      name: 'test',
      id: 'test',
      ip: null,
    };
    const emptyNameHost: Partial<HostEcsFields> = {
      name: null,
      id: 'test',
      ip: ['10.10.10.10'],
    };
    test('it renders correctly against snapshot', () => {
      const wrapper = mount(
        <TestProviders>
          {hostNameRenderer(mockData.complete.source!.host!, '10.10.10.10')}
        </TestProviders>
      );

      expect(toJson(wrapper)).toMatchSnapshot();
    });

    test('it renders emptyTagValue when non-matching IP is provided', () => {
      const wrapper = mount(
        <TestProviders>
          {hostNameRenderer(mockData.complete.source!.host!, '10.10.10.11')}
        </TestProviders>
      );
      expect(wrapper.text()).toEqual('--');
    });

    test('it renders emptyTagValue when no host.id is provided', () => {
      const wrapper = mount(
        <TestProviders>{hostNameRenderer(emptyIdHost, IpOverviewType.source)}</TestProviders>
      );
      expect(wrapper.text()).toEqual('--');
    });
    test('it renders emptyTagValue when no host.ip is provided', () => {
      const wrapper = mount(
        <TestProviders>{hostNameRenderer(emptyIpHost, IpOverviewType.source)}</TestProviders>
      );
      expect(wrapper.text()).toEqual('--');
    });
    test('it renders emptyTagValue when no host.name is provided', () => {
      const wrapper = mount(
        <TestProviders>{hostNameRenderer(emptyNameHost, IpOverviewType.source)}</TestProviders>
      );
      expect(wrapper.text()).toEqual('--');
    });
  });

  describe('#whoisRenderer', () => {
    test('it renders correctly against snapshot', () => {
      const wrapper = mountWithIntl(<TestProviders>{whoisRenderer('10.10.10.10')}</TestProviders>);

      expect(toJson(wrapper)).toMatchSnapshot();
    });
  });

  describe('#reputationRenderer', () => {
    test('it renders correctly against snapshot', () => {
      const wrapper = mountWithIntl(<TestProviders>{whoisRenderer('10.10.10.10')}</TestProviders>);

      expect(toJson(wrapper)).toMatchSnapshot();
    });
  });
});
