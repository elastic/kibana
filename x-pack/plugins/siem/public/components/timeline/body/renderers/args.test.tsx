/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { shallow } from 'enzyme';
import toJson from 'enzyme-to-json';
import * as React from 'react';
import { mountWithIntl } from 'test_utils/enzyme_helpers';

import { TestProviders } from '../../../../mock';
import { getEmptyString } from '../../../empty_value';
import { Args } from './args';

describe('Args', () => {
  describe('rendering', () => {
    test('it renders against shallow snapshot', () => {
      const wrapper = shallow(
        <Args
          contextId="context-123"
          eventId="event-123"
          args="arg1 arg2 arg3"
          processTitle="process-title-1"
        />
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

    test('it returns empty string if args happens to be an empty string', () => {
      const wrapper = mountWithIntl(
        <TestProviders>
          <Args
            contextId="context-123"
            eventId="event-123"
            args=""
            processTitle="process-title-1"
          />
        </TestProviders>
      );
      expect(wrapper.text()).toEqual(getEmptyString());
    });
  });
});
