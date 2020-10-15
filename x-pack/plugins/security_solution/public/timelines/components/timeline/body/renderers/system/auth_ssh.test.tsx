/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { shallow } from 'enzyme';
import React from 'react';

import '../../../../../../common/mock/match_media';
import { AuthSsh } from './auth_ssh';

describe('AuthSsh', () => {
  describe('rendering', () => {
    test('it renders against shallow snapshot', () => {
      const wrapper = shallow(
        <AuthSsh
          contextId="[context-123]"
          eventId="[event-123]"
          sshSignature="[ssh-signature]"
          sshMethod="[ssh-method]"
        />
      );
      expect(wrapper).toMatchSnapshot();
    });

    test('it returns null if sshSignature and sshMethod are both null', () => {
      const wrapper = shallow(
        <AuthSsh
          contextId="[context-123]"
          eventId="[event-123]"
          sshSignature={null}
          sshMethod={null}
        />
      );
      expect(wrapper.children().length).toEqual(0);
    });

    test('it returns null if sshSignature and sshMethod are both undefined', () => {
      const wrapper = shallow(
        <AuthSsh
          contextId="[context-123]"
          eventId="[event-123]"
          sshSignature={undefined}
          sshMethod={undefined}
        />
      );
      expect(wrapper.children().length).toEqual(0);
    });

    test('it returns null if sshSignature is null and sshMethod is undefined', () => {
      const wrapper = shallow(
        <AuthSsh
          contextId="[context-123]"
          eventId="[event-123]"
          sshSignature={null}
          sshMethod={undefined}
        />
      );
      expect(wrapper.children().length).toEqual(0);
    });

    test('it returns null if sshSignature is undefined and sshMethod is null', () => {
      const wrapper = shallow(
        <AuthSsh
          contextId="[context-123]"
          eventId="[event-123]"
          sshSignature={undefined}
          sshMethod={null}
        />
      );
      expect(wrapper.children().length).toEqual(0);
    });

    test('it returns sshSignature if sshMethod is null', () => {
      const wrapper = shallow(
        <AuthSsh
          contextId="[context-123]"
          eventId="[event-123]"
          sshSignature="[sshSignature-1]"
          sshMethod={null}
        />
      );
      expect(wrapper.find('DraggableBadge').prop('value')).toEqual('[sshSignature-1]');
    });

    test('it returns sshMethod if sshSignature is null', () => {
      const wrapper = shallow(
        <AuthSsh
          contextId="[context-123]"
          eventId="[event-123]"
          sshSignature={null}
          sshMethod="[sshMethod-1]"
        />
      );
      expect(wrapper.find('DraggableBadge').prop('value')).toEqual('[sshMethod-1]');
    });
  });
});
