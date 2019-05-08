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
import { ProcessDraggable, isNillOrEmptyString } from './process_draggable';

describe('ProcessDraggable', () => {
  describe('rendering', () => {
    test('it renders against shallow snapshot', () => {
      const wrapper = shallow(
        <ProcessDraggable
          contextId="context-123"
          eventId="event-123"
          processExecutable="process-executable-1"
          processName="process-name-1"
          processPid={123}
        />
      );
      expect(toJson(wrapper)).toMatchSnapshot();
    });

    test('it returns null if everything is null', () => {
      const wrapper = mountWithIntl(
        <TestProviders>
          <ProcessDraggable
            contextId="context-123"
            eventId="event-123"
            processExecutable={null}
            processName={null}
            processPid={null}
          />
        </TestProviders>
      );
      expect(wrapper.text()).toBeNull();
    });

    test('it returns null if everything is undefined', () => {
      const wrapper = mountWithIntl(
        <TestProviders>
          <ProcessDraggable
            contextId="context-123"
            eventId="event-123"
            processExecutable={undefined}
            processName={undefined}
            processPid={undefined}
          />
        </TestProviders>
      );
      expect(wrapper.text()).toBeNull();
    });

    test('it returns process name if that is all that is passed in', () => {
      const wrapper = mountWithIntl(
        <TestProviders>
          <ProcessDraggable
            contextId="context-123"
            eventId="event-123"
            processExecutable={undefined}
            processName="[process-name]"
            processPid={undefined}
          />
        </TestProviders>
      );
      expect(wrapper.text()).toEqual('[process-name]');
    });

    test('it returns process executable if that is all that is passed in', () => {
      const wrapper = mountWithIntl(
        <TestProviders>
          <ProcessDraggable
            contextId="context-123"
            eventId="event-123"
            processExecutable="[process-executable]"
            processName={null}
            processPid={undefined}
          />
        </TestProviders>
      );
      expect(wrapper.text()).toEqual('[process-executable]');
    });

    test('it returns process pid if that is all that is passed in', () => {
      const wrapper = mountWithIntl(
        <TestProviders>
          <ProcessDraggable
            contextId="context-123"
            eventId="event-123"
            processExecutable={null}
            processName={null}
            processPid={123}
          />
        </TestProviders>
      );
      expect(wrapper.text()).toEqual('123');
    });

    test('it returns process name if everything else is an empty string', () => {
      const wrapper = mountWithIntl(
        <TestProviders>
          <ProcessDraggable
            contextId="context-123"
            eventId="event-123"
            processExecutable=""
            processName="[process-name]"
            processPid={NaN}
          />
        </TestProviders>
      );
      expect(wrapper.text()).toEqual('[process-name]');
    });

    test('it returns process executable if everything else is an empty string', () => {
      const wrapper = mountWithIntl(
        <TestProviders>
          <ProcessDraggable
            contextId="context-123"
            eventId="event-123"
            processExecutable="[process-executable]"
            processName=""
            processPid={NaN}
          />
        </TestProviders>
      );
      expect(wrapper.text()).toEqual('[process-executable]');
    });

    test('it returns process pid if everything else is an empty string', () => {
      const wrapper = mountWithIntl(
        <TestProviders>
          <ProcessDraggable
            contextId="context-123"
            eventId="event-123"
            processExecutable=""
            processName=""
            processPid={123}
          />
        </TestProviders>
      );
      expect(wrapper.text()).toEqual('123');
    });

    test('it returns process name if everything is filled', () => {
      const wrapper = mountWithIntl(
        <TestProviders>
          <ProcessDraggable
            contextId="context-123"
            eventId="event-123"
            processExecutable="[process-executable]"
            processName="[process-name]"
            processPid={123}
          />
        </TestProviders>
      );
      expect(wrapper.text()).toEqual('[process-name]');
    });

    test('it returns process executable if process name is undefined', () => {
      const wrapper = mountWithIntl(
        <TestProviders>
          <ProcessDraggable
            contextId="context-123"
            eventId="event-123"
            processExecutable="[process-executable]"
            processName={undefined}
            processPid={123}
          />
        </TestProviders>
      );
      expect(wrapper.text()).toEqual('[process-executable]');
    });

    test('it returns process executable if process name is an empty string', () => {
      const wrapper = mountWithIntl(
        <TestProviders>
          <ProcessDraggable
            contextId="context-123"
            eventId="event-123"
            processExecutable="[process-executable]"
            processName=""
            processPid={123}
          />
        </TestProviders>
      );
      expect(wrapper.text()).toEqual('[process-executable]');
    });
  });

  describe('isNillOrEmptyString', () => {
    test('undefined returns true', () => {
      expect(isNillOrEmptyString(undefined)).toEqual(true);
    });

    test('null returns true', () => {
      expect(isNillOrEmptyString(null)).toEqual(true);
    });

    test('empty string returns true', () => {
      expect(isNillOrEmptyString('')).toEqual(true);
    });

    test('single space string returns false', () => {
      expect(isNillOrEmptyString(' ')).toEqual(false);
    });

    test('regular value returns false', () => {
      expect(isNillOrEmptyString('[process-name-1]')).toEqual(false);
    });
  });
});
