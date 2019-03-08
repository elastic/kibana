/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import toJson from 'enzyme-to-json';
import * as React from 'react';
import { mountWithIntl } from 'test_utils/enzyme_helpers';

import { mockEcsData, TestProviders } from '../../../../mock';

import { ZeekDetails } from './zeek_details';

describe('ZeekDetails', () => {
  describe('rendering', () => {
    test('it renders the default ZeekDetails', () => {
      const wrapper = mountWithIntl(
        <TestProviders>
          <ZeekDetails data={mockEcsData[2]} />
        </TestProviders>
      );
      expect(toJson(wrapper)).toMatchSnapshot();
    });

    test('it returns zeek.connection if the data does contain zeek.connection data', () => {
      const wrapper = mountWithIntl(
        <TestProviders>
          <ZeekDetails data={mockEcsData[13]} />
        </TestProviders>
      );
      expect(wrapper.text()).toEqual(
        'C8DRTq362Fios6hw16connectionREJSrConnection attempt rejectedSource185.176.26.101:44059Destination207.154.238.205:11568'
      );
    });

    test('it returns zeek.dns if the data does contain zeek.dns data', () => {
      const wrapper = mountWithIntl(
        <TestProviders>
          <ZeekDetails data={mockEcsData[14]} />
        </TestProviders>
      );
      expect(wrapper.text()).toEqual(
        'CyIrMA1L1JtLqdIuoldnsSource206.189.35.240:57475Destination67.207.67.3:53'
      );
    });

    test('it returns zeek.http if the data does contain zeek.http data', () => {
      const wrapper = mountWithIntl(
        <TestProviders>
          <ZeekDetails data={mockEcsData[15]} />
        </TestProviders>
      );
      expect(wrapper.text()).toEqual(
        'CZLkpC22NquQJOpkwehttp302Source206.189.35.240:36220Destination192.241.164.26:80'
      );
    });

    test('it returns zeek.notice if the data does contain zeek.notice data', () => {
      const wrapper = mountWithIntl(
        <TestProviders>
          <ZeekDetails data={mockEcsData[16]} />
        </TestProviders>
      );
      expect(wrapper.text()).toEqual(
        'noticeDropped:falseScan::Port_Scan8.42.77.171 scanned at least 15 unique ports of host 207.154.238.205 in 0m0sSource8.42.77.171:--'
      );
    });

    test('it returns zeek.ssl if the data does contain zeek.ssl data', () => {
      const wrapper = mountWithIntl(
        <TestProviders>
          <ZeekDetails data={mockEcsData[17]} />
        </TestProviders>
      );
      expect(wrapper.text()).toEqual(
        'CmTxzt2OVXZLkGDaResslTLSv12TLS_ECDHE_RSA_WITH_AES_128_GCM_SHA256TLS_ECDHE_RSA_WITH_AES_128_GCM_SHA256Source188.166.66.184:34514Destination91.189.95.15:443'
      );
    });

    test('it returns zeek.files if the data does contain zeek.files data', () => {
      const wrapper = mountWithIntl(
        <TestProviders>
          <ZeekDetails data={mockEcsData[18]} />
        </TestProviders>
      );
      expect(wrapper.text()).toEqual(
        'Cu0n232QMyvNtzb75jfilessha1: fa5195a...md5: f7653f1...fa5195a5dfacc9d1c68d43600f0e0262cad14dde'
      );
    });

    test('it returns null for text if the data contains no zeek data', () => {
      const wrapper = mountWithIntl(
        <TestProviders>
          <ZeekDetails data={mockEcsData[0]} />
        </TestProviders>
      );
      expect(wrapper.text()).toEqual(null);
    });
  });
});
