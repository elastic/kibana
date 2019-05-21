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
import { UserHostWorkingDir } from './user_host_working_dir';

describe('UserHostWorkingDir', () => {
  describe('rendering', () => {
    test('it renders against shallow snapshot', () => {
      const wrapper = shallow(
        <UserHostWorkingDir
          contextId="context-123"
          eventId="event-123"
          userName="[userName-123]"
          hostName="[hostName-123]"
          workingDirectory="[working-directory-123]"
        />
      );
      expect(toJson(wrapper)).toMatchSnapshot();
    });

    test('it returns null if userName, hostName, and workingDirectory are all null', () => {
      const wrapper = mountWithIntl(
        <TestProviders>
          <UserHostWorkingDir
            contextId="context-123"
            eventId="event-123"
            userName={null}
            hostName={null}
            workingDirectory={null}
          />
        </TestProviders>
      );
      expect(wrapper.text()).toBeNull();
    });

    test('it returns null if userName, hostName, and workingDirectory are all undefined', () => {
      const wrapper = mountWithIntl(
        <TestProviders>
          <UserHostWorkingDir
            contextId="context-123"
            eventId="event-123"
            userName={undefined}
            hostName={undefined}
            workingDirectory={undefined}
          />
        </TestProviders>
      );
      expect(wrapper.text()).toBeNull();
    });

    test('it returns userName if that is the only attribute defined', () => {
      const wrapper = mountWithIntl(
        <TestProviders>
          <div>
            <UserHostWorkingDir
              contextId="context-123"
              eventId="event-123"
              userName="[user-name-123]"
              hostName={undefined}
              workingDirectory={undefined}
            />
          </div>
        </TestProviders>
      );
      expect(wrapper.text()).toEqual('[user-name-123]');
    });

    test('it returns hostName if that is the only attribute defined', () => {
      const wrapper = mountWithIntl(
        <TestProviders>
          <div>
            <UserHostWorkingDir
              contextId="context-123"
              eventId="event-123"
              userName={null}
              hostName="[host-name-123]"
              workingDirectory={undefined}
            />
          </div>
        </TestProviders>
      );
      expect(wrapper.text()).toEqual('[host-name-123]');
    });

    test('it returns "in" + workingDirectory if that is the only attribute defined', () => {
      const wrapper = mountWithIntl(
        <TestProviders>
          <div>
            <UserHostWorkingDir
              contextId="context-123"
              eventId="event-123"
              userName={null}
              hostName={null}
              workingDirectory="[working-directory-123]"
            />
          </div>
        </TestProviders>
      );
      expect(wrapper.text()).toEqual('in[working-directory-123]');
    });

    test('it returns userName and workingDirectory', () => {
      const wrapper = mountWithIntl(
        <TestProviders>
          <div>
            <UserHostWorkingDir
              contextId="context-123"
              eventId="event-123"
              userName="[user-name-123]"
              hostName={null}
              workingDirectory="[working-directory-123]"
            />
          </div>
        </TestProviders>
      );
      expect(wrapper.text()).toEqual('[user-name-123]in[working-directory-123]');
    });

    test('it returns hostName and workingDirectory', () => {
      const wrapper = mountWithIntl(
        <TestProviders>
          <div>
            <UserHostWorkingDir
              contextId="context-123"
              eventId="event-123"
              userName={null}
              hostName="[host-name-123]"
              workingDirectory="[working-directory-123]"
            />
          </div>
        </TestProviders>
      );
      expect(wrapper.text()).toEqual('[host-name-123]in[working-directory-123]');
    });

    test('it returns userName, hostName', () => {
      const wrapper = mountWithIntl(
        <TestProviders>
          <div>
            <UserHostWorkingDir
              contextId="context-123"
              eventId="event-123"
              userName="[user-name-123]"
              hostName="[host-name-123]"
              workingDirectory={null}
            />
          </div>
        </TestProviders>
      );
      expect(wrapper.text()).toEqual('[user-name-123]@[host-name-123]');
    });
  });
});
