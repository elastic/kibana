/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { mount } from 'enzyme';
import React from 'react';
import { STATUS, UISession } from '../../../../common/search/sessions_mgmt';
import { LocaleWrapper } from '../__mocks__';
import { InlineActions } from './actions';

let session: UISession;

describe('Background Search Session management actions', () => {
  beforeEach(() => {
    session = {
      name: 'cool search',
      id: 'wtywp9u2802hahgp-gluk',
      url: '/app/great-app-url/#43',
      appId: 'canvas',
      status: STATUS.IN_PROGRESS,
      created: '2020-12-02T00:19:32Z',
      expires: '2020-12-07T00:19:32Z',
      isViewable: true,
      expiresSoon: false,
    };
  });

  describe('Inline actions', () => {
    test('isViewable = true', () => {
      const actions = mount(
        <LocaleWrapper>
          <InlineActions url="/app/kibana/coolapp" session={session} />
        </LocaleWrapper>
      );

      expect(
        actions.find(`[data-test-subj="session-mgmt-view-action-wtywp9u2802hahgp-gluk"]`).exists()
      ).toBe(true);

      expect(actions.find(`[data-test-subj="session-mgmt-view-href"]`).first().prop('href')).toBe(
        '/app/kibana/coolapp'
      );
    });

    test('isViewable = false', () => {
      session.isViewable = false;
      const actions = mount(
        <LocaleWrapper>
          <InlineActions url="/app/kibana/coolapp" session={session} />
        </LocaleWrapper>
      );

      expect(
        actions.find(`[data-test-subj="session-mgmt-view-action-wtywp9u2802hahgp-gluk"]`).exists()
      ).toBe(false);
    });

    test('error handling', () => {
      (session as any).created = null;
      (session as any).expires = null;
      (session as any).status = null;

      const actions = mount(
        <LocaleWrapper>
          <InlineActions url="/app/kibana/coolapp" session={session} />
        </LocaleWrapper>
      );

      // no unhandled errors
      expect(
        actions.find(`[data-test-subj="session-mgmt-view-action-wtywp9u2802hahgp-gluk"]`).exists()
      ).toBe(true);
    });
  });
});
