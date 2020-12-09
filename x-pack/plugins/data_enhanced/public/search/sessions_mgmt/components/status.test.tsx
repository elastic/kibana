/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiTextProps, EuiToolTipProps } from '@elastic/eui';
import { MockedKeys } from '@kbn/utility-types/jest';
import { mount } from 'enzyme';
import { CoreSetup } from 'kibana/public';
import React from 'react';
import { coreMock } from 'src/core/public/mocks';
import { STATUS, UISession } from '../../../../common/search/sessions_mgmt';
import { LocaleWrapper } from '../__mocks__';
import { getStatusText, StatusIndicator } from './status';

let mockCoreSetup: MockedKeys<CoreSetup>;
let session: UISession;

const mockNowTime = new Date();
mockNowTime.setTime(1607026176061);

describe('Background Search Session management status labels', () => {
  beforeEach(() => {
    mockCoreSetup = coreMock.createSetup();
    mockCoreSetup.uiSettings.get.mockImplementation(() => 'Browser');

    session = {
      name: 'amazing test',
      id: 'wtywp9u2802hahgp-gsla',
      url: '/app/great-app-url/#45',
      appId: 'security',
      status: STATUS.IN_PROGRESS,
      created: '2020-12-02T00:19:32Z',
      expires: '2020-12-07T00:19:32Z',
      isViewable: true,
      expiresSoon: false,
    };
  });

  describe('getStatusText', () => {
    test('in progress', () => {
      expect(getStatusText(STATUS.IN_PROGRESS)).toBe('In progress');
    });
    test('expired', () => {
      expect(getStatusText(STATUS.EXPIRED)).toBe('Expired');
    });
    test('cancelled', () => {
      expect(getStatusText(STATUS.CANCELLED)).toBe('Cancelled');
    });
    test('complete', () => {
      expect(getStatusText(STATUS.COMPLETE)).toBe('Complete');
    });
    test('error', () => {
      expect(getStatusText('error')).toBe('Error');
    });
  });

  describe('StatusIndicator', () => {
    test('render in progress', () => {
      const statusIndicator = mount(
        <LocaleWrapper>
          <StatusIndicator session={session} uiSettings={mockCoreSetup.uiSettings} />
        </LocaleWrapper>
      );

      const label = statusIndicator.find(
        `.euiText[data-test-subj="session-mgmt-view-status-label-in_progress"]`
      );
      expect(label.text()).toMatchInlineSnapshot(`"In progress"`);
    });

    test('complete', () => {
      session.status = STATUS.COMPLETE;

      const statusIndicator = mount(
        <LocaleWrapper>
          <StatusIndicator session={session} uiSettings={mockCoreSetup.uiSettings} />
        </LocaleWrapper>
      );

      const label = statusIndicator
        .find(`[data-test-subj="session-mgmt-view-status-label-complete"]`)
        .first();
      expect((label.props() as EuiTextProps).color).toBe('secondary');
      expect(label.text()).toBe('Complete');
    });

    test('complete - expires soon', () => {
      session.status = STATUS.COMPLETE;
      session.expiresSoon = true;

      const statusIndicator = mount(
        <LocaleWrapper>
          <StatusIndicator
            session={session}
            now={mockNowTime.toISOString()}
            uiSettings={mockCoreSetup.uiSettings}
          />
        </LocaleWrapper>
      );

      const tooltip = statusIndicator.find('EuiToolTip');
      expect((tooltip.first().props() as EuiToolTipProps).content).toMatchInlineSnapshot(
        `"Expires on 6 Dec, 2020, 19:19:32"`
      );
    });

    test('expired', () => {
      session.status = STATUS.EXPIRED;

      const statusIndicator = mount(
        <LocaleWrapper>
          <StatusIndicator
            session={session}
            now={mockNowTime.toISOString()}
            uiSettings={mockCoreSetup.uiSettings}
          />
        </LocaleWrapper>
      );

      const label = statusIndicator
        .find(`[data-test-subj="session-mgmt-view-status-label-expired"]`)
        .first();
      expect(label.text()).toBe('Expired');
    });

    test('error handling', () => {
      session.status = STATUS.COMPLETE;
      (session as any).created = null;
      (session as any).expires = null;

      const statusIndicator = mount(
        <LocaleWrapper>
          <StatusIndicator
            session={session}
            now={mockNowTime.toISOString()}
            uiSettings={mockCoreSetup.uiSettings}
          />
        </LocaleWrapper>
      );

      // no unhandled errors
      const label = statusIndicator
        .find(`[data-test-subj="session-mgmt-view-status-label-complete"]`)
        .first();
      expect(label.exists()).toBe(false);
    });
  });
});
