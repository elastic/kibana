/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { mount, shallow } from 'enzyme';
import toJson from 'enzyme-to-json';
import * as React from 'react';
import { shallowWithIntl } from 'test_utils/enzyme_helpers';

import { FlowTarget, GetIpOverviewQuery, HostEcsFields } from '../../graphql/types';
import { TestProviders } from '../../mock';
import { getEmptyValue } from '../empty_value';

import {
  autonomousSystemRenderer,
  dateRenderer,
  hostNameRenderer,
  locationRenderer,
  whoisRenderer,
} from './field_renderers';
import { mockData } from '../page/network/ip_overview/mock';

type AutonomousSystem = GetIpOverviewQuery.AutonomousSystem;

describe('Field Renderers', () => {
  describe('#locationRenderer', () => {
    test('it renders correctly against snapshot', () => {
      const wrapper = shallow(
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
      expect(wrapper.text()).toEqual(getEmptyValue());
    });

    test('it renders emptyTagValue when invalid fields provided', () => {
      const wrapper = mount(
        <TestProviders>
          {locationRenderer(['source.geo.my_house'], mockData.complete)}
        </TestProviders>
      );
      expect(wrapper.text()).toEqual(getEmptyValue());
    });
  });

  describe('#dateRenderer', () => {
    test('it renders correctly against snapshot', () => {
      const wrapper = shallow(
        <TestProviders>{dateRenderer('firstSeen', mockData.complete.source!)}</TestProviders>
      );

      expect(toJson(wrapper)).toMatchSnapshot();
    });

    test('it renders emptyTagValue when invalid field provided', () => {
      const wrapper = mount(
        <TestProviders>{dateRenderer('geo.spark_plug', mockData.complete.source!)}</TestProviders>
      );
      expect(wrapper.text()).toEqual(getEmptyValue());
    });
  });

  describe('#autonomousSystemRenderer', () => {
    const emptyMock: AutonomousSystem = { as_org: null, asn: null, ip: '10.10.10.10' };
    const halfEmptyMock: AutonomousSystem = { as_org: null, asn: 'Test ASN', ip: '10.10.10.10' };

    test('it renders correctly against snapshot', () => {
      const wrapper = shallow(
        <TestProviders>
          {autonomousSystemRenderer(mockData.complete.source!.autonomousSystem!, FlowTarget.source)}
        </TestProviders>
      );

      expect(toJson(wrapper)).toMatchSnapshot();
    });

    test('it renders emptyTagValue when non-string field provided', () => {
      const wrapper = mount(
        <TestProviders>{autonomousSystemRenderer(halfEmptyMock, FlowTarget.source)}</TestProviders>
      );
      expect(wrapper.text()).toEqual(getEmptyValue());
    });

    test('it renders emptyTagValue when invalid field provided', () => {
      const wrapper = mount(
        <TestProviders>{autonomousSystemRenderer(emptyMock, FlowTarget.source)}</TestProviders>
      );
      expect(wrapper.text()).toEqual(getEmptyValue());
    });
  });

  describe('#hostIdRenderer', () => {
    const emptyIdHost: Partial<HostEcsFields> = {
      name: ['test'],
      id: null,
      ip: ['10.10.10.10'],
    };
    const emptyIpHost: Partial<HostEcsFields> = {
      name: ['test'],
      id: ['test'],
      ip: null,
    };
    test('it renders correctly against snapshot', () => {
      const wrapper = shallow(
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
      expect(wrapper.text()).toEqual(getEmptyValue());
    });

    test('it renders emptyTagValue when no host.id is provided', () => {
      const wrapper = mount(
        <TestProviders>{hostNameRenderer(emptyIdHost, FlowTarget.source)}</TestProviders>
      );
      expect(wrapper.text()).toEqual(getEmptyValue());
    });
    test('it renders emptyTagValue when no host.ip is provided', () => {
      const wrapper = mount(
        <TestProviders>{hostNameRenderer(emptyIpHost, FlowTarget.source)}</TestProviders>
      );
      expect(wrapper.text()).toEqual(getEmptyValue());
    });
  });

  describe('#hostNameRenderer', () => {
    const emptyIdHost: Partial<HostEcsFields> = {
      name: ['test'],
      id: null,
      ip: ['10.10.10.10'],
    };
    const emptyIpHost: Partial<HostEcsFields> = {
      name: ['test'],
      id: ['test'],
      ip: null,
    };
    const emptyNameHost: Partial<HostEcsFields> = {
      name: null,
      id: ['test'],
      ip: ['10.10.10.10'],
    };
    test('it renders correctly against snapshot', () => {
      const wrapper = shallow(
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
      expect(wrapper.text()).toEqual(getEmptyValue());
    });

    test('it renders emptyTagValue when no host.id is provided', () => {
      const wrapper = mount(
        <TestProviders>{hostNameRenderer(emptyIdHost, FlowTarget.source)}</TestProviders>
      );
      expect(wrapper.text()).toEqual(getEmptyValue());
    });
    test('it renders emptyTagValue when no host.ip is provided', () => {
      const wrapper = mount(
        <TestProviders>{hostNameRenderer(emptyIpHost, FlowTarget.source)}</TestProviders>
      );
      expect(wrapper.text()).toEqual(getEmptyValue());
    });
    test('it renders emptyTagValue when no host.name is provided', () => {
      const wrapper = mount(
        <TestProviders>{hostNameRenderer(emptyNameHost, FlowTarget.source)}</TestProviders>
      );
      expect(wrapper.text()).toEqual(getEmptyValue());
    });
  });

  describe('#whoisRenderer', () => {
    test('it renders correctly against snapshot', () => {
      const wrapper = shallowWithIntl(
        <TestProviders>{whoisRenderer('10.10.10.10')}</TestProviders>
      );

      expect(toJson(wrapper)).toMatchSnapshot();
    });
  });

  describe('#reputationRenderer', () => {
    test('it renders correctly against snapshot', () => {
      const wrapper = shallowWithIntl(
        <TestProviders>{whoisRenderer('10.10.10.10')}</TestProviders>
      );

      expect(toJson(wrapper)).toMatchSnapshot();
    });
  });
});
