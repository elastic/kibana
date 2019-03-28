/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import toJson from 'enzyme-to-json';
import * as React from 'react';
import { mountWithIntl, shallowWithIntl } from 'test_utils/enzyme_helpers';
import { BrowserFields } from 'x-pack/plugins/secops/public/containers/source';

import { mockBrowserFields } from '../../../../containers/source/mock';
import { mockEcsData, TestProviders } from '../../../../mock';

import {
  AuditdWasAuthorizedDetails,
  AuditdWasAuthorizedLine,
} from './auditd_was_authorized_details';

describe('AuditAcquiredCredsDetails', () => {
  describe('rendering', () => {
    test('it renders the default AuditAcquiredCredsDetails', () => {
      // I cannot and do not want to use the BrowserFields mocks for the snapshot tests as they are too heavy
      const browserFields: BrowserFields = {};
      const wrapper = shallowWithIntl(
        <TestProviders>
          <AuditdWasAuthorizedDetails browserFields={browserFields} data={mockEcsData[21]} />
        </TestProviders>
      );
      expect(toJson(wrapper)).toMatchSnapshot();
    });

    test('it returns auditd if the data does contain auditd data', () => {
      const wrapper = mountWithIntl(
        <TestProviders>
          <AuditdWasAuthorizedDetails browserFields={mockBrowserFields} data={mockEcsData[19]} />
        </TestProviders>
      );
      expect(wrapper.text()).toEqual(
        'Sessionjohnson@zeek-sanfranin/was authorized to use/usr/bin/gpgconf--list-dirs agent-socketgpgconf'
      );
    });

    test('it returns null for text if the data contains no auditd data', () => {
      const wrapper = mountWithIntl(
        <TestProviders>
          <AuditdWasAuthorizedDetails browserFields={mockBrowserFields} data={mockEcsData[0]} />
        </TestProviders>
      );
      expect(wrapper.text()).toBeNull();
    });
  });

  // NOTE: It's best if all the arguments are sent into this function and they typically should be otherwise
  // you have something wrong with your beats. These tests are to ensure the function does not
  // crash. If you need to format things prettier because not all the data is there, then update
  // these tests with those changes
  describe('#AuditdWasAuthorizedLine', () => {
    test('it returns pretty output if you send in all your happy path data', () => {
      const wrapper = mountWithIntl(
        <TestProviders>
          <AuditdWasAuthorizedLine
            id="hello-i-am-an-id"
            hostName="host-1"
            userName="username-1"
            session="session-1"
            primary="username-1"
            secondary="username-1"
            processExecutable="process-1"
            processTitle="process-title-1"
            workingDirectory="working-directory-1"
            args="arg1 arg2 arg3"
          />
        </TestProviders>
      );
      expect(wrapper.text()).toEqual(
        'Sessionsession-1username-1@host-1inworking-directory-1was authorized to useprocess-1arg1 arg2 arg3'
      );
    });

    test('it returns a session with username if username, primary, and secondary all equal each other ', () => {
      const wrapper = mountWithIntl(
        <TestProviders>
          <AuditdWasAuthorizedLine
            id="hello-i-am-an-id"
            hostName="host-1"
            session="session-1"
            userName="username-1"
            primary="username-1"
            secondary="username-1"
            processExecutable="process-1"
            processTitle="process-title-1"
            workingDirectory="working-directory-1"
            args="arg1 arg2 arg3"
          />
        </TestProviders>
      );
      expect(wrapper.text()).toEqual(
        'Sessionsession-1username-1@host-1inworking-directory-1was authorized to useprocess-1arg1 arg2 arg3'
      );
    });

    test('it returns a session with username if primary and secondary equal unset', () => {
      const wrapper = mountWithIntl(
        <TestProviders>
          <AuditdWasAuthorizedLine
            id="hello-i-am-an-id"
            hostName="host-1"
            session="session-1"
            userName="username-1"
            primary="unset"
            secondary="unset"
            processExecutable="process-1"
            processTitle="process-title-1"
            workingDirectory="working-directory-1"
            args="arg1 arg2 arg3"
          />
        </TestProviders>
      );
      expect(wrapper.text()).toEqual(
        'Sessionsession-1username-1@host-1inworking-directory-1was authorized to useprocess-1arg1 arg2 arg3'
      );
    });

    test('it returns a session with username if primary and secondary equal unset with different casing', () => {
      const wrapper = mountWithIntl(
        <TestProviders>
          <AuditdWasAuthorizedLine
            id="hello-i-am-an-id"
            hostName="host-1"
            userName="username-1"
            session="session-1"
            primary="Unset"
            secondary="uNseT"
            processExecutable="process-1"
            processTitle="process-title-1"
            workingDirectory="working-directory-1"
            args="arg1 arg2 arg3"
          />
        </TestProviders>
      );
      expect(wrapper.text()).toEqual(
        'Sessionsession-1username-1@host-1inworking-directory-1was authorized to useprocess-1arg1 arg2 arg3'
      );
    });

    test('it returns a session with username if primary and secondary are undefined', () => {
      const wrapper = mountWithIntl(
        <TestProviders>
          <AuditdWasAuthorizedLine
            id="hello-i-am-an-id"
            hostName="host-1"
            session="session-1"
            primary={undefined}
            secondary={undefined}
            userName="username-1"
            processExecutable="process-1"
            processTitle="process-title-1"
            workingDirectory="working-directory-1"
            args="arg1 arg2 arg3"
          />
        </TestProviders>
      );
      expect(wrapper.text()).toEqual(
        'Sessionsession-1username-1@host-1inworking-directory-1was authorized to useprocess-1arg1 arg2 arg3'
      );
    });

    test('it returns a session with "as" wording if username, primary, and secondary are all different', () => {
      const wrapper = mountWithIntl(
        <TestProviders>
          <AuditdWasAuthorizedLine
            id="hello-i-am-an-id"
            hostName="host-1"
            session="session-1"
            userName="[username-1]"
            primary="[username-2]"
            secondary="[username-3]"
            processExecutable="process-1"
            processTitle="process-title-1"
            workingDirectory="working-directory-1"
            args="arg1 arg2 arg3"
          />
        </TestProviders>
      );
      expect(wrapper.text()).toEqual(
        'Sessionsession-1[username-2]as[username-3]@host-1inworking-directory-1was authorized to useprocess-1arg1 arg2 arg3'
      );
    });

    test('it returns a session with "as" wording if username and primary are the same but secondary is different', () => {
      const wrapper = mountWithIntl(
        <TestProviders>
          <AuditdWasAuthorizedLine
            id="hello-i-am-an-id"
            hostName="host-1"
            session="session-1"
            userName="[username-1]"
            primary="[username-1]"
            secondary="[username-2]"
            processExecutable="process-1"
            processTitle="process-title-1"
            workingDirectory="working-directory-1"
            args="arg1 arg2 arg3"
          />
        </TestProviders>
      );
      expect(wrapper.text()).toEqual(
        'Sessionsession-1[username-1]as[username-2]@host-1inworking-directory-1was authorized to useprocess-1arg1 arg2 arg3'
      );
    });

    test('it returns a session with primary if username and secondary are unset with different casing', () => {
      const wrapper = mountWithIntl(
        <TestProviders>
          <AuditdWasAuthorizedLine
            id="hello-i-am-an-id"
            hostName="host-1"
            userName="unseT"
            session="session-1"
            primary="[username-primary]"
            secondary="unset"
            processExecutable="process-1"
            processTitle="process-title-1"
            workingDirectory="working-directory-1"
            args="arg1 arg2 arg3"
          />
        </TestProviders>
      );
      expect(wrapper.text()).toEqual(
        'Sessionsession-1[username-primary]@host-1inworking-directory-1was authorized to useprocess-1arg1 arg2 arg3'
      );
    });

    test('it returns a session with primary if username and secondary are undefined', () => {
      const wrapper = mountWithIntl(
        <TestProviders>
          <AuditdWasAuthorizedLine
            id="hello-i-am-an-id"
            hostName="host-1"
            session="session-1"
            primary="[username-primary]"
            userName={undefined}
            secondary={undefined}
            processExecutable="process-1"
            processTitle="process-title-1"
            workingDirectory="working-directory-1"
            args="arg1 arg2 arg3"
          />
        </TestProviders>
      );
      expect(wrapper.text()).toEqual(
        'Sessionsession-1[username-primary]@host-1inworking-directory-1was authorized to useprocess-1arg1 arg2 arg3'
      );
    });

    test('it returns just a session if only given an id', () => {
      const wrapper = mountWithIntl(
        <TestProviders>
          <AuditdWasAuthorizedLine
            id="hello-i-am-an-id"
            userName={undefined}
            secondary={undefined}
            session={undefined}
            hostName={undefined}
            primary={undefined}
            processExecutable={undefined}
            processTitle={undefined}
            workingDirectory={undefined}
            args={undefined}
          />
        </TestProviders>
      );
      expect(wrapper.text()).toEqual('Session');
    });

    test('it returns only session and hostName if only hostname and an id is given', () => {
      const wrapper = mountWithIntl(
        <TestProviders>
          <AuditdWasAuthorizedLine
            id="hello-i-am-an-id"
            hostName="some-host-name"
            userName={undefined}
            secondary={undefined}
            session={undefined}
            primary={undefined}
            processExecutable={undefined}
            processTitle={undefined}
            workingDirectory={undefined}
            args={undefined}
          />
        </TestProviders>
      );
      expect(wrapper.text()).toEqual('Session@some-host-name');
    });

    test('it returns only a session and user name if only a user name and id is given', () => {
      const wrapper = mountWithIntl(
        <TestProviders>
          <AuditdWasAuthorizedLine
            id="hello-i-am-an-id"
            userName="some-user-name"
            secondary={undefined}
            session={undefined}
            hostName={undefined}
            primary={undefined}
            processExecutable={undefined}
            processTitle={undefined}
            workingDirectory={undefined}
            args={undefined}
          />
        </TestProviders>
      );
      expect(wrapper.text()).toEqual('Sessionsome-user-name');
    });

    test('it returns only a process name if only given a process name and id', () => {
      const wrapper = mountWithIntl(
        <TestProviders>
          <AuditdWasAuthorizedLine
            id="hello-i-am-an-id"
            userName={undefined}
            processExecutable="some-process-name"
            secondary={undefined}
            session={undefined}
            hostName={undefined}
            primary={undefined}
            processTitle={undefined}
            workingDirectory={undefined}
            args={undefined}
          />
        </TestProviders>
      );
      expect(wrapper.text()).toEqual('Sessionwas authorized to usesome-process-name');
    });

    test('it returns only session if process title with id is given', () => {
      const wrapper = mountWithIntl(
        <TestProviders>
          <AuditdWasAuthorizedLine
            id="hello-i-am-an-id"
            processTitle="some-process-title"
            userName="some-user-name"
            secondary={undefined}
            session={undefined}
            hostName={undefined}
            primary={undefined}
            processExecutable={undefined}
            workingDirectory={undefined}
            args={undefined}
          />
        </TestProviders>
      );
      expect(wrapper.text()).toEqual('Sessionsome-user-name');
    });

    test('it returns only a working directory if that is all that is given with a id', () => {
      const wrapper = mountWithIntl(
        <TestProviders>
          <AuditdWasAuthorizedLine
            id={'hello-i-am-an-id'}
            workingDirectory="some-working-directory"
            userName={undefined}
            secondary={undefined}
            session={undefined}
            hostName={undefined}
            primary={undefined}
            processExecutable={undefined}
            processTitle={undefined}
            args={undefined}
          />
        </TestProviders>
      );
      expect(wrapper.text()).toEqual('Sessioninsome-working-directory');
    });

    test('it returns only the session args with id if that is all that is given (very unlikely situation)', () => {
      const wrapper = mountWithIntl(
        <TestProviders>
          <AuditdWasAuthorizedLine
            id="hello-i-am-an-id"
            args="arg1 arg2 arg 3"
            userName={undefined}
            secondary={undefined}
            session={undefined}
            hostName={undefined}
            primary={undefined}
            processExecutable={undefined}
            processTitle={undefined}
            workingDirectory={undefined}
          />
        </TestProviders>
      );
      expect(wrapper.text()).toEqual('Sessionarg1 arg2 arg 3');
    });
  });
});
