/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiTextProps, EuiToolTipProps } from '@elastic/eui';
import { mount } from 'enzyme';
import React from 'react';
import { SearchSessionStatus } from '../../../../../../../src/plugins/data/common/';
import { UISession } from '../types';
import { LocaleWrapper } from '../__mocks__';
import { getStatusText, StatusIndicator } from './status';

let tz: string;
let session: UISession;

const mockNowTime = new Date();
mockNowTime.setTime(1607026176061);

describe('Background Search Session management status labels', () => {
  beforeEach(() => {
    tz = 'Browser';
    session = {
      name: 'amazing test',
      id: 'wtywp9u2802hahgp-gsla',
      restoreUrl: '/app/great-app-url/#45',
      reloadUrl: '/app/great-app-url/#45',
      numSearches: 1,
      appId: 'security',
      status: SearchSessionStatus.IN_PROGRESS,
      created: '2020-12-02T00:19:32Z',
      expires: '2020-12-07T00:19:32Z',
      initialState: {},
      restoreState: {},
      version: '8.0.0',
    };
  });

  describe('getStatusText', () => {
    test('in progress', () => {
      expect(getStatusText(SearchSessionStatus.IN_PROGRESS)).toBe('In progress');
    });
    test('expired', () => {
      expect(getStatusText(SearchSessionStatus.EXPIRED)).toBe('Expired');
    });
    test('cancelled', () => {
      expect(getStatusText(SearchSessionStatus.CANCELLED)).toBe('Cancelled');
    });
    test('complete', () => {
      expect(getStatusText(SearchSessionStatus.COMPLETE)).toBe('Complete');
    });
    test('error', () => {
      expect(getStatusText('error')).toBe('Error');
    });
  });

  describe('StatusIndicator', () => {
    test('render in progress', () => {
      const statusIndicator = mount(
        <LocaleWrapper>
          <StatusIndicator session={session} timezone={tz} />
        </LocaleWrapper>
      );

      const label = statusIndicator.find(
        `.euiText[data-test-subj="sessionManagementStatusLabel"][data-test-status="in_progress"]`
      );
      expect(label.text()).toMatchInlineSnapshot(`"In progress"`);
    });

    test('complete', () => {
      session.status = SearchSessionStatus.COMPLETE;

      const statusIndicator = mount(
        <LocaleWrapper>
          <StatusIndicator session={session} timezone={tz} />
        </LocaleWrapper>
      );

      const label = statusIndicator
        .find(`[data-test-subj="sessionManagementStatusLabel"][data-test-status="complete"]`)
        .first();
      expect((label.props() as EuiTextProps).color).toBe('success');
      expect(label.text()).toBe('Complete');
    });

    test('complete - expires soon', () => {
      session.status = SearchSessionStatus.COMPLETE;

      const statusIndicator = mount(
        <LocaleWrapper>
          <StatusIndicator session={session} now={mockNowTime.toISOString()} timezone={tz} />
        </LocaleWrapper>
      );

      const tooltip = statusIndicator.find('EuiToolTip');
      expect((tooltip.first().props() as EuiToolTipProps).content).toMatchInlineSnapshot(
        `"Expires on 6 Dec, 2020, 19:19:32"`
      );
    });

    test('expired', () => {
      session.status = SearchSessionStatus.EXPIRED;

      const statusIndicator = mount(
        <LocaleWrapper>
          <StatusIndicator session={session} now={mockNowTime.toISOString()} timezone={tz} />
        </LocaleWrapper>
      );

      const label = statusIndicator
        .find(`[data-test-subj="sessionManagementStatusLabel"][data-test-status="expired"]`)
        .first();
      expect(label.text()).toBe('Expired');
    });

    test('error handling', () => {
      session.status = SearchSessionStatus.COMPLETE;
      (session as any).created = null;
      (session as any).expires = null;

      const statusIndicator = mount(
        <LocaleWrapper>
          <StatusIndicator session={session} now={mockNowTime.toISOString()} timezone={tz} />
        </LocaleWrapper>
      );

      // no unhandled errors
      const tooltip = statusIndicator.find('EuiToolTip');
      expect((tooltip.first().props() as EuiToolTipProps).content).toMatchInlineSnapshot(
        `"Expires on unknown"`
      );
    });
  });
});
