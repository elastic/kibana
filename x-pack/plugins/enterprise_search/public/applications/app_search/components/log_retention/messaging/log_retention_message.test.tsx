/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { setMockValues } from '../../../../__mocks__/kea.mock';
import { mountWithIntl } from '../../../../__mocks__';

import React from 'react';
import { shallow } from 'enzyme';

import { LogRetentionOptions } from '../types';
import { LogRetentionMessage } from './';

describe('LogRetentionMessage', () => {
  const analytics = LogRetentionOptions.Analytics;
  const api = LogRetentionOptions.API;

  const setLogRetention = (logRetention: object, ilmEnabled: boolean = true) => {
    const logRetentionSettings = {
      disabledAt: null,
      enabled: true,
      retentionPolicy: null,
      ...logRetention,
    };

    setMockValues({
      ilmEnabled,
      logRetention: {
        [LogRetentionOptions.API]: logRetentionSettings,
        [LogRetentionOptions.Analytics]: logRetentionSettings,
      },
    });
  };

  it('does not render if ILM is unavailable', () => {
    setMockValues({ logRetention: null });
    const wrapper = shallow(<LogRetentionMessage type={api} />);

    expect(wrapper.isEmptyRender()).toBe(true);
  });

  it('does not render if log retention settings are empty', () => {
    setMockValues({ logRetention: { api: null } });
    const wrapper = shallow(<LogRetentionMessage type={api} />);

    expect(wrapper.isEmptyRender()).toBe(true);
  });

  describe('when logs are enabled', () => {
    describe("and they're using the default policy", () => {
      describe('a retention policy message renders', () => {
        beforeEach(() => {
          setLogRetention({
            enabled: true,
            retentionPolicy: {
              isDefault: true,
              minAgeDays: 7,
            },
          });
        });

        it('for analytics', () => {
          const wrapper = mountWithIntl(<LogRetentionMessage type={analytics} />);
          expect(wrapper.text()).toEqual(
            'Your analytics logs are being stored for at least 7 days.'
          );
        });

        it('for api', () => {
          const wrapper = mountWithIntl(<LogRetentionMessage type={api} />);
          expect(wrapper.text()).toEqual('Your API logs are being stored for at least 7 days.');
        });
      });
    });

    describe('and there is a custom policy', () => {
      describe('a retention policy message renders', () => {
        beforeEach(() => {
          setLogRetention({
            enabled: true,
            retentionPolicy: {
              isDefault: false,
              minAgeDays: 7,
            },
          });
        });

        it('for analytics', () => {
          const wrapper = mountWithIntl(<LogRetentionMessage type={analytics} />);
          expect(wrapper.text()).toEqual('You have a custom analytics log retention policy.');
        });

        it('for api', () => {
          const wrapper = mountWithIntl(<LogRetentionMessage type={api} />);
          expect(wrapper.text()).toEqual('You have a custom API log retention policy.');
        });
      });
    });
  });

  describe('when logs are disabled', () => {
    describe('and there is no disabledAt date', () => {
      describe('a no logging message renders', () => {
        beforeEach(() => {
          setLogRetention({
            enabled: false,
            disabledAt: null,
          });
        });

        it('for api', () => {
          const wrapper = mountWithIntl(<LogRetentionMessage type={api} />);
          expect(wrapper.text()).toEqual(
            'API logging has been disabled for all engines. There are no API logs collected.'
          );
        });

        it('for analytics', () => {
          const wrapper = mountWithIntl(<LogRetentionMessage type={analytics} />);
          expect(wrapper.text()).toEqual(
            'Analytics logging has been disabled for all engines. There are no analytics logs collected.'
          );
        });
      });
    });

    describe('and there is a disabledAt date', () => {
      describe('a no logging message renders with a date', () => {
        beforeEach(() => {
          setLogRetention({
            enabled: false,
            disabledAt: 'Thu, 05 Nov 2020 18:57:28 +0000',
          });
        });

        it('for analytics', () => {
          const wrapper = mountWithIntl(<LogRetentionMessage type={analytics} />);
          expect(wrapper.text()).toEqual(
            'Analytics logging has been disabled for all engines. The last date analytics logs were collected was November 5, 2020.'
          );
        });

        it('for api', () => {
          const wrapper = mountWithIntl(<LogRetentionMessage type={api} />);
          expect(wrapper.text()).toEqual(
            'API logging has been disabled for all engines. The last date API logs were collected was November 5, 2020.'
          );
        });
      });
    });
  });

  describe('when ILM is disabled entirely', () => {
    describe('an ILM disabled message renders', () => {
      beforeEach(() => {
        setLogRetention({}, false);
      });

      it('for analytics', () => {
        const wrapper = mountWithIntl(<LogRetentionMessage type={analytics} />);
        expect(wrapper.text()).toEqual("App Search isn't managing analytics log retention.");
      });

      it('for api', () => {
        const wrapper = mountWithIntl(<LogRetentionMessage type={api} />);
        expect(wrapper.text()).toEqual("App Search isn't managing API log retention.");
      });
    });
  });
});
