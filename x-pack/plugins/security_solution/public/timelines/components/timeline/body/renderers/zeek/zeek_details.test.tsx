/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import { removeExternalLinkText } from '@kbn/securitysolution-io-ts-utils';
import '../../../../../../common/mock/match_media';
import { mockBrowserFields } from '../../../../../../common/containers/source/mock';
import { mockTimelineData, TestProviders } from '../../../../../../common/mock';
import { useMountAppended } from '../../../../../../common/utils/use_mount_appended';
import { ZeekDetails } from './zeek_details';

// EuiIcons coming from .testenv render the icon's aria-label as a span
// extractEuiIcon removes the aria-label before checking for equality
const extractEuiIconText = (str: string) => {
  return str.replaceAll('External link', '');
};

jest.mock('../../../../../../common/lib/kibana');

jest.mock('@elastic/eui', () => {
  const original = jest.requireActual('@elastic/eui');
  return {
    ...original,
    EuiScreenReaderOnly: () => <></>,
  };
});

jest.mock('../../../../../../common/components/link_to');

describe('ZeekDetails', () => {
  const mount = useMountAppended();

  describe('rendering', () => {
    test('it renders the default ZeekDetails', () => {
      const wrapper = mount(
        <TestProviders>
          <ZeekDetails
            data={mockTimelineData[2].ecs}
            browserFields={mockBrowserFields}
            timelineId="test"
          />
        </TestProviders>
      );
      expect(wrapper.find('ZeekDetails')).toMatchSnapshot();
    });

    test('it returns zeek.connection if the data does contain zeek.connection data', () => {
      const wrapper = mount(
        <TestProviders>
          <ZeekDetails
            data={mockTimelineData[13].ecs}
            browserFields={mockBrowserFields}
            timelineId="test"
          />
        </TestProviders>
      );
      expect(extractEuiIconText(removeExternalLinkText(wrapper.text()))).toEqual(
        'C8DRTq362Fios6hw16connectionREJSrConnection attempt rejectedtcpSource185.176.26.101:44059Destination207.154.238.205:11568'
      );
    });

    test('it returns zeek.dns if the data does contain zeek.dns data', () => {
      const wrapper = mount(
        <TestProviders>
          <ZeekDetails
            data={mockTimelineData[14].ecs}
            browserFields={mockBrowserFields}
            timelineId="test"
          />
        </TestProviders>
      );
      expect(extractEuiIconText(removeExternalLinkText(wrapper.text()))).toEqual(
        'CyIrMA1L1JtLqdIuoldnsudpSource206.189.35.240:57475Destination67.207.67.3:53'
      );
    });

    test('it returns zeek.http if the data does contain zeek.http data', () => {
      const wrapper = mount(
        <TestProviders>
          <ZeekDetails
            data={mockTimelineData[15].ecs}
            browserFields={mockBrowserFields}
            timelineId="test"
          />
        </TestProviders>
      );
      expect(extractEuiIconText(removeExternalLinkText(wrapper.text()))).toEqual(
        'CZLkpC22NquQJOpkwehttp302Source206.189.35.240:36220Destination192.241.164.26:80'
      );
    });

    test('it returns zeek.notice if the data does contain zeek.notice data', () => {
      const wrapper = mount(
        <TestProviders>
          <ZeekDetails
            data={mockTimelineData[16].ecs}
            browserFields={mockBrowserFields}
            timelineId="test"
          />
        </TestProviders>
      );
      expect(extractEuiIconText(removeExternalLinkText(wrapper.text()))).toEqual(
        'noticeDropped:falseScan::Port_Scan8.42.77.171 scanned at least 15 unique ports of host 207.154.238.205 in 0m0sSource8.42.77.171'
      );
    });

    test('it returns zeek.ssl if the data does contain zeek.ssl data', () => {
      const wrapper = mount(
        <TestProviders>
          <ZeekDetails
            data={mockTimelineData[17].ecs}
            browserFields={mockBrowserFields}
            timelineId="test"
          />
        </TestProviders>
      );
      expect(extractEuiIconText(removeExternalLinkText(wrapper.text()))).toEqual(
        'CmTxzt2OVXZLkGDaResslTLSv12TLS_ECDHE_RSA_WITH_AES_128_GCM_SHA256TLS_ECDHE_RSA_WITH_AES_128_GCM_SHA256Source188.166.66.184:34514Destination91.189.95.15:443'
      );
    });

    test('it returns zeek.files if the data does contain zeek.files data', () => {
      const wrapper = mount(
        <TestProviders>
          <ZeekDetails
            data={mockTimelineData[18].ecs}
            browserFields={mockBrowserFields}
            timelineId="test"
          />
        </TestProviders>
      );
      expect(wrapper.text()).toEqual('Cu0n232QMyvNtzb75jfilessha1: fa5195a...md5: f7653f1...');
    });

    test('it returns null for text if the data contains no zeek data', () => {
      const wrapper = mount(
        <TestProviders>
          <ZeekDetails
            data={mockTimelineData[0].ecs}
            browserFields={mockBrowserFields}
            timelineId="test"
          />
        </TestProviders>
      );
      expect(wrapper.find('ZeekDetails').children().exists()).toBeFalsy();
    });
  });
});
