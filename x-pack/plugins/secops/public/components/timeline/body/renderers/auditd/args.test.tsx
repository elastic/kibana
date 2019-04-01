/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import toJson from 'enzyme-to-json';
import * as React from 'react';
import { mountWithIntl, shallowWithIntl } from 'test_utils/enzyme_helpers';

import { TestProviders } from '../../../../../mock';

import { Args } from './args';

describe('Args', () => {
  describe('rendering', () => {
    test('it renders against shallow snapshot', () => {
      const wrapper = shallowWithIntl(
        <TestProviders>
          <Args
            contextId="context-123"
            eventId="event-123"
            args="arg1 arg2 arg3"
            processTitle="process-title-1"
          />
        </TestProviders>
      );
      expect(toJson(wrapper)).toMatchSnapshot();
    });

    test('it returns null if args is undefined', () => {
      const wrapper = mountWithIntl(
        <TestProviders>
          <Args
            contextId="context-123"
            eventId="event-123"
            args={undefined}
            processTitle="process-title-1"
          />
        </TestProviders>
      );
      expect(wrapper.text()).toBeNull();
    });

    test('it returns null if args is null', () => {
      const wrapper = mountWithIntl(
        <TestProviders>
          <Args
            contextId="context-123"
            eventId="event-123"
            args={null}
            processTitle="process-title-1"
          />
        </TestProviders>
      );
      expect(wrapper.text()).toBeNull();
    });
  });
});
