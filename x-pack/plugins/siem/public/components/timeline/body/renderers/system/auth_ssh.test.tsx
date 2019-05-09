/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { shallow } from 'enzyme';
import toJson from 'enzyme-to-json';
import * as React from 'react';
import { mountWithIntl } from 'test_utils/enzyme_helpers';

import { TestProviders } from '../../../../../mock';
import { AuthSsh } from './auth_ssh';

describe('AuthSsh', () => {
  describe('rendering', () => {
    test('it renders against shallow snapshot', () => {
      const wrapper = shallow(
        <TestProviders>
          <AuthSsh
            contextId="[context-123]"
            eventId="[event-123]"
            sshSignature="[ssh-signature]"
            sshMethod="[ssh-method]"
          />
        </TestProviders>
      );
      expect(toJson(wrapper)).toMatchSnapshot();
    });

    test('it returns null if sshSignature and sshMethod are both null', () => {
      const wrapper = mountWithIntl(
        <TestProviders>
          <AuthSsh
            contextId="[context-123]"
            eventId="[event-123]"
            sshSignature={null}
            sshMethod={null}
          />
        </TestProviders>
      );
      expect(wrapper.text()).toBeNull();
    });

    test('it returns null if sshSignature and sshMethod are both undefined', () => {
      const wrapper = mountWithIntl(
        <TestProviders>
          <AuthSsh
            contextId="[context-123]"
            eventId="[event-123]"
            sshSignature={undefined}
            sshMethod={undefined}
          />
        </TestProviders>
      );
      expect(wrapper.text()).toBeNull();
    });

    test('it returns null if sshSignature is null and sshMethod is undefined', () => {
      const wrapper = mountWithIntl(
        <TestProviders>
          <AuthSsh
            contextId="[context-123]"
            eventId="[event-123]"
            sshSignature={null}
            sshMethod={undefined}
          />
        </TestProviders>
      );
      expect(wrapper.text()).toBeNull();
    });

    test('it returns null if sshSignature is undefined and sshMethod is null', () => {
      const wrapper = mountWithIntl(
        <TestProviders>
          <AuthSsh
            contextId="[context-123]"
            eventId="[event-123]"
            sshSignature={undefined}
            sshMethod={null}
          />
        </TestProviders>
      );
      expect(wrapper.text()).toBeNull();
    });

    test('it returns sshSignature if sshMethod is null', () => {
      const wrapper = mountWithIntl(
        <TestProviders>
          <AuthSsh
            contextId="[context-123]"
            eventId="[event-123]"
            sshSignature="[sshSignature-1]"
            sshMethod={null}
          />
        </TestProviders>
      );
      expect(wrapper.text()).toEqual('[sshSignature-1]');
    });

    test('it returns sshMethod if sshSignature is null', () => {
      const wrapper = mountWithIntl(
        <TestProviders>
          <AuthSsh
            contextId="[context-123]"
            eventId="[event-123]"
            sshSignature={null}
            sshMethod="[sshMethod-1]"
          />
        </TestProviders>
      );
      expect(wrapper.text()).toEqual('[sshMethod-1]');
    });
  });
});
