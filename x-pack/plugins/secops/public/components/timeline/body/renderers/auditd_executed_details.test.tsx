/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import toJson from 'enzyme-to-json';
import * as React from 'react';
import { mountWithIntl, shallowWithIntl } from 'test_utils/enzyme_helpers';

import { mockEcsData, TestProviders } from '../../../../mock';

import { AuditdExecutedCommandLine, AuditdExecutedDetails } from './auditd_executed_details';

describe('AuditExecutedDetails', () => {
  describe('rendering', () => {
    test('it renders the default AuditExecutedDetails', () => {
      const wrapper = shallowWithIntl(
        <TestProviders>
          <AuditdExecutedDetails data={mockEcsData[19]} />
        </TestProviders>
      );
      expect(toJson(wrapper)).toMatchSnapshot();
    });

    test('it returns auditd executed if the data does contain auditd executed data', () => {
      const wrapper = mountWithIntl(
        <TestProviders>
          <AuditdExecutedDetails data={mockEcsData[19]} />
        </TestProviders>
      );
      expect(wrapper.text()).toEqual(
        'Sessionjohnson@zeek-sanfranin/executedgpgconf--list-dirs agent-socket'
      );
    });

    test('it returns null for text if the data contains no auditd executed data', () => {
      const wrapper = mountWithIntl(
        <TestProviders>
          <AuditdExecutedDetails data={mockEcsData[0]} />
        </TestProviders>
      );
      expect(wrapper.text()).toEqual(null);
    });
  });

  // NOTE: It's best if all the arguments are sent into this function and they typically should be otherwise
  // you have something wrong with your beats. These tests are to ensure the function does not
  // crash. If you need to format things prettier because not all the data is there, then update
  // these tests with those changes
  describe('#AuditdExecutedCommandLine', () => {
    test('it returns pretty output if you send in all your happy path data', () => {
      const wrapper = mountWithIntl(
        <TestProviders>
          <AuditdExecutedCommandLine
            id="hello-i-am-an-id"
            hostName="host-1"
            userName="username-1"
            processName="process-1"
            processTitle="process-title-1"
            workingDirectory="working-directory-1"
            args="arg1 arg2 arg3"
          />
        </TestProviders>
      );
      expect(wrapper.text()).toEqual(
        'Sessionusername-1@host-1inworking-directory-1executedprocess-1arg1 arg2 arg3'
      );
    });

    test('it returns a session with username if username, primary, and secondary all equal each other ', () => {
      const wrapper = mountWithIntl(
        <TestProviders>
          <AuditdExecutedCommandLine
            id="hello-i-am-an-id"
            hostName="host-1"
            userName="username-1"
            primary="username-1"
            secondary="username-1"
            processName="process-1"
            processTitle="process-title-1"
            workingDirectory="working-directory-1"
            args="arg1 arg2 arg3"
          />
        </TestProviders>
      );
      expect(wrapper.text()).toEqual(
        'Sessionusername-1@host-1inworking-directory-1executedprocess-1arg1 arg2 arg3'
      );
    });

    test('it returns a session with username if primary and secondary equal unset', () => {
      const wrapper = mountWithIntl(
        <TestProviders>
          <AuditdExecutedCommandLine
            id="hello-i-am-an-id"
            hostName="host-1"
            userName="username-1"
            primary="unset"
            secondary="unset"
            processName="process-1"
            processTitle="process-title-1"
            workingDirectory="working-directory-1"
            args="arg1 arg2 arg3"
          />
        </TestProviders>
      );
      expect(wrapper.text()).toEqual(
        'Sessionusername-1@host-1inworking-directory-1executedprocess-1arg1 arg2 arg3'
      );
    });

    test('it returns a session with username if primary and secondary equal unset with different casing', () => {
      const wrapper = mountWithIntl(
        <TestProviders>
          <AuditdExecutedCommandLine
            id="hello-i-am-an-id"
            hostName="host-1"
            userName="username-1"
            primary="Unset"
            secondary="uNseT"
            processName="process-1"
            processTitle="process-title-1"
            workingDirectory="working-directory-1"
            args="arg1 arg2 arg3"
          />
        </TestProviders>
      );
      expect(wrapper.text()).toEqual(
        'Sessionusername-1@host-1inworking-directory-1executedprocess-1arg1 arg2 arg3'
      );
    });

    test('it returns a session with username if primary and secondary are undefined', () => {
      const wrapper = mountWithIntl(
        <TestProviders>
          <AuditdExecutedCommandLine
            id="hello-i-am-an-id"
            hostName="host-1"
            userName="username-1"
            processName="process-1"
            processTitle="process-title-1"
            workingDirectory="working-directory-1"
            args="arg1 arg2 arg3"
          />
        </TestProviders>
      );
      expect(wrapper.text()).toEqual(
        'Sessionusername-1@host-1inworking-directory-1executedprocess-1arg1 arg2 arg3'
      );
    });

    test('it returns a session with "as" wording if username, primary, and secondary are all different', () => {
      const wrapper = mountWithIntl(
        <TestProviders>
          <AuditdExecutedCommandLine
            id="hello-i-am-an-id"
            hostName="host-1"
            userName="[username-1]"
            primary="[username-2]"
            secondary="[username-3]"
            processName="process-1"
            processTitle="process-title-1"
            workingDirectory="working-directory-1"
            args="arg1 arg2 arg3"
          />
        </TestProviders>
      );
      expect(wrapper.text()).toEqual(
        'Session[username-2]as[username-3]@host-1inworking-directory-1executedprocess-1arg1 arg2 arg3'
      );
    });

    test('it returns a session with "as" wording if username and primary are the same but secondary is different', () => {
      const wrapper = mountWithIntl(
        <TestProviders>
          <AuditdExecutedCommandLine
            id="hello-i-am-an-id"
            hostName="host-1"
            userName="[username-1]"
            primary="[username-1]"
            secondary="[username-2]"
            processName="process-1"
            processTitle="process-title-1"
            workingDirectory="working-directory-1"
            args="arg1 arg2 arg3"
          />
        </TestProviders>
      );
      expect(wrapper.text()).toEqual(
        'Session[username-1]as[username-2]@host-1inworking-directory-1executedprocess-1arg1 arg2 arg3'
      );
    });

    test('it returns a session with primary if username and secondary are unset with different casing', () => {
      const wrapper = mountWithIntl(
        <TestProviders>
          <AuditdExecutedCommandLine
            id="hello-i-am-an-id"
            hostName="host-1"
            userName="unseT"
            primary="[username-primary]"
            secondary="unset"
            processName="process-1"
            processTitle="process-title-1"
            workingDirectory="working-directory-1"
            args="arg1 arg2 arg3"
          />
        </TestProviders>
      );
      expect(wrapper.text()).toEqual(
        'Session[username-primary]@host-1inworking-directory-1executedprocess-1arg1 arg2 arg3'
      );
    });

    test('it returns a session with primary if username and secondary are undefined', () => {
      const wrapper = mountWithIntl(
        <TestProviders>
          <AuditdExecutedCommandLine
            id="hello-i-am-an-id"
            hostName="host-1"
            primary="[username-primary]"
            processName="process-1"
            processTitle="process-title-1"
            workingDirectory="working-directory-1"
            args="arg1 arg2 arg3"
          />
        </TestProviders>
      );
      expect(wrapper.text()).toEqual(
        'Session[username-primary]@host-1inworking-directory-1executedprocess-1arg1 arg2 arg3'
      );
    });

    test('it returns ugly output if you just send in an id', () => {
      const wrapper = mountWithIntl(
        <TestProviders>
          <AuditdExecutedCommandLine id="hello-i-am-an-id" />
        </TestProviders>
      );
      expect(wrapper.text()).toEqual('Session@inexecuted');
    });

    test('it returns slightly less ugly output if you just send in an id and hostName', () => {
      const wrapper = mountWithIntl(
        <TestProviders>
          <AuditdExecutedCommandLine id="hello-i-am-an-id" hostName="some-host-name" />
        </TestProviders>
      );
      expect(wrapper.text()).toEqual('Session@some-host-nameinexecuted');
    });

    test('it returns slightly less ugly output if you just send in a username', () => {
      const wrapper = mountWithIntl(
        <TestProviders>
          <AuditdExecutedCommandLine id="hello-i-am-an-id" userName="some-user-name" />
        </TestProviders>
      );
      expect(wrapper.text()).toEqual('Sessionsome-user-name@inexecuted');
    });

    test('it returns slightly less ugly output if you just send in a processName', () => {
      const wrapper = mountWithIntl(
        <TestProviders>
          <AuditdExecutedCommandLine id="hello-i-am-an-id" processName="some-process-name" />
        </TestProviders>
      );
      expect(wrapper.text()).toEqual('Session@inexecutedsome-process-name');
    });

    test('it returns slightly less ugly output if you just send in a processTitle', () => {
      const wrapper = mountWithIntl(
        <TestProviders>
          <AuditdExecutedCommandLine id="hello-i-am-an-id" processTitle="some-process-title" />
        </TestProviders>
      );
      expect(wrapper.text()).toEqual('Session@inexecuted');
    });

    test('it returns slightly less ugly output if you just send in a workingDirectory', () => {
      const wrapper = mountWithIntl(
        <TestProviders>
          <AuditdExecutedCommandLine
            id={'hello-i-am-an-id'}
            workingDirectory="some-working-directory"
          />
        </TestProviders>
      );
      expect(wrapper.text()).toEqual('Session@insome-working-directoryexecuted');
    });

    test('it returns slightly less ugly output if you just send in args', () => {
      const wrapper = mountWithIntl(
        <TestProviders>
          <AuditdExecutedCommandLine id="hello-i-am-an-id" args="arg1 arg 2 arg 3" />
        </TestProviders>
      );
      expect(wrapper.text()).toEqual('Session@inexecutedarg1 arg 2 arg 3');
    });
  });
});
