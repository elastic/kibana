/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { shallow } from 'enzyme';
import React from 'react';

import '../../../../../../common/mock/match_media';
import { mockTimelineData, TestProviders } from '../../../../../../common/mock';
import { AuditdGenericDetails, AuditdGenericLine } from './generic_details';
import { useMountAppended } from '../../../../../../common/utils/use_mount_appended';

jest.mock('../../../../../../common/lib/kibana');

jest.mock('@elastic/eui', () => {
  const original = jest.requireActual('@elastic/eui');
  return {
    ...original,
    EuiScreenReaderOnly: () => <></>,
  };
});

describe('GenericDetails', () => {
  const mount = useMountAppended();

  describe('rendering', () => {
    test('it renders the default AuditAcquiredCredsDetails', () => {
      const wrapper = shallow(
        <AuditdGenericDetails
          contextId="contextid-123"
          text="generic-text-123"
          data={mockTimelineData[21].ecs}
          timelineId="test"
        />
      );
      expect(wrapper).toMatchSnapshot();
    });

    test('it returns auditd if the data does contain auditd data', () => {
      const wrapper = mount(
        <TestProviders>
          <AuditdGenericDetails
            contextId="contextid-123"
            text="generic-text-123"
            data={mockTimelineData[19].ecs}
            timelineId="test"
          />
        </TestProviders>
      );
      expect(wrapper.text()).toEqual(
        'Sessionalice@zeek-sanfranin/generic-text-123gpgconf(5402)gpgconf--list-dirsagent-socketgpgconf --list-dirs agent-socket'
      );
    });

    test('it returns null for text if the data contains no auditd data', () => {
      const wrapper = shallow(
        <AuditdGenericDetails
          contextId="contextid-123"
          text="generic-text-123"
          data={mockTimelineData[0].ecs}
          timelineId="test"
        />
      );
      expect(wrapper.isEmptyRender()).toBeTruthy();
    });
  });

  describe('#AuditdConnectedToLine', () => {
    test('it returns pretty output if you send in all your happy path data', () => {
      const wrapper = mount(
        <TestProviders>
          <AuditdGenericLine
            id="hello-i-am-an-id"
            contextId="contextid-123"
            text="generic-text-123"
            hostName="host-1"
            userName="username-1"
            session="session-1"
            primary="username-1"
            secondary="username-1"
            processPid={123}
            processName="process-name-1"
            processExecutable="process-1"
            processTitle="process-title-1"
            workingDirectory="working-directory-1"
            args={['arg1', 'arg2', 'arg3']}
            result="success"
          />
        </TestProviders>
      );
      expect(wrapper.text()).toEqual(
        'Sessionsession-1username-1@host-1inworking-directory-1generic-text-123process-name-1(123)arg1arg2arg3process-title-1with resultsuccess'
      );
    });

    test('it returns a session with username if username, primary, and secondary all equal each other ', () => {
      const wrapper = mount(
        <TestProviders>
          <AuditdGenericLine
            id="hello-i-am-an-id"
            contextId="contextid-123"
            text="generic-text-123"
            hostName="host-1"
            session="session-1"
            userName="username-1"
            primary="username-1"
            secondary="username-1"
            processPid={123}
            processName="process-name-1"
            processExecutable="process-1"
            processTitle="process-title-1"
            workingDirectory="working-directory-1"
            args={['arg1', 'arg2', 'arg3']}
            result="success"
          />
        </TestProviders>
      );
      expect(wrapper.text()).toEqual(
        'Sessionsession-1username-1@host-1inworking-directory-1generic-text-123process-name-1(123)arg1arg2arg3process-title-1with resultsuccess'
      );
    });

    test('it returns a session with username if primary and secondary equal unset', () => {
      const wrapper = mount(
        <TestProviders>
          <AuditdGenericLine
            id="hello-i-am-an-id"
            contextId="contextid-123"
            text="generic-text-123"
            hostName="host-1"
            session="session-1"
            userName="username-1"
            primary="unset"
            secondary="unset"
            processPid={123}
            processName="process-name-1"
            processExecutable="process-1"
            processTitle="process-title-1"
            workingDirectory="working-directory-1"
            args={['arg1', 'arg2', 'arg3']}
            result="success"
          />
        </TestProviders>
      );
      expect(wrapper.text()).toEqual(
        'Sessionsession-1username-1@host-1inworking-directory-1generic-text-123process-name-1(123)arg1arg2arg3process-title-1with resultsuccess'
      );
    });

    test('it returns a session with username if primary and secondary equal unset with different casing', () => {
      const wrapper = mount(
        <TestProviders>
          <AuditdGenericLine
            id="hello-i-am-an-id"
            contextId="contextid-123"
            text="generic-text-123"
            hostName="host-1"
            userName="username-1"
            session="session-1"
            primary="Unset"
            secondary="uNseT"
            processPid={123}
            processName="process-name-1"
            processExecutable="process-1"
            processTitle="process-title-1"
            workingDirectory="working-directory-1"
            args={['arg1', 'arg2', 'arg3']}
            result="success"
          />
        </TestProviders>
      );
      expect(wrapper.text()).toEqual(
        'Sessionsession-1username-1@host-1inworking-directory-1generic-text-123process-name-1(123)arg1arg2arg3process-title-1with resultsuccess'
      );
    });

    test('it returns a session with username if primary and secondary are undefined', () => {
      const wrapper = mount(
        <TestProviders>
          <AuditdGenericLine
            id="hello-i-am-an-id"
            contextId="contextid-123"
            text="generic-text-123"
            hostName="host-1"
            session="session-1"
            primary={undefined}
            secondary={undefined}
            userName="username-1"
            processPid={123}
            processName="process-name-1"
            processExecutable="process-1"
            processTitle="process-title-1"
            workingDirectory="working-directory-1"
            args={['arg1', 'arg2', 'arg3']}
            result="success"
          />
        </TestProviders>
      );
      expect(wrapper.text()).toEqual(
        'Sessionsession-1username-1@host-1inworking-directory-1generic-text-123process-name-1(123)arg1arg2arg3process-title-1with resultsuccess'
      );
    });

    test('it returns a session with "as" wording if username, primary, and secondary are all different', () => {
      const wrapper = mount(
        <TestProviders>
          <AuditdGenericLine
            id="hello-i-am-an-id"
            contextId="contextid-123"
            text="generic-text-123"
            hostName="host-1"
            session="session-1"
            userName="[username-1]"
            primary="[username-2]"
            secondary="[username-3]"
            processPid={123}
            processName="process-name-1"
            processExecutable="process-1"
            processTitle="process-title-1"
            workingDirectory="working-directory-1"
            args={['arg1', 'arg2', 'arg3']}
            result="success"
          />
        </TestProviders>
      );
      expect(wrapper.text()).toEqual(
        'Sessionsession-1[username-2]as[username-3]@host-1inworking-directory-1generic-text-123process-name-1(123)arg1arg2arg3process-title-1with resultsuccess'
      );
    });

    test('it returns a session with "as" wording if username and primary are the same but secondary is different', () => {
      const wrapper = mount(
        <TestProviders>
          <AuditdGenericLine
            id="hello-i-am-an-id"
            contextId="contextid-123"
            text="generic-text-123"
            hostName="host-1"
            session="session-1"
            userName="[username-1]"
            primary="[username-1]"
            secondary="[username-2]"
            processPid={123}
            processName="process-name-1"
            processExecutable="process-1"
            processTitle="process-title-1"
            workingDirectory="working-directory-1"
            args={['arg1', 'arg2', 'arg3']}
            result="success"
          />
        </TestProviders>
      );
      expect(wrapper.text()).toEqual(
        'Sessionsession-1[username-1]as[username-2]@host-1inworking-directory-1generic-text-123process-name-1(123)arg1arg2arg3process-title-1with resultsuccess'
      );
    });

    test('it returns a session with primary if username and secondary are unset with different casing', () => {
      const wrapper = mount(
        <TestProviders>
          <AuditdGenericLine
            id="hello-i-am-an-id"
            contextId="contextid-123"
            text="generic-text-123"
            hostName="host-1"
            userName="unseT"
            session="session-1"
            primary="[username-primary]"
            secondary="unset"
            processPid={123}
            processName="process-name-1"
            processExecutable="process-1"
            processTitle="process-title-1"
            workingDirectory="working-directory-1"
            args={['arg1', 'arg2', 'arg3']}
            result="success"
          />
        </TestProviders>
      );
      expect(wrapper.text()).toEqual(
        'Sessionsession-1[username-primary]@host-1inworking-directory-1generic-text-123process-name-1(123)arg1arg2arg3process-title-1with resultsuccess'
      );
    });

    test('it returns a session with primary if username and secondary are undefined', () => {
      const wrapper = mount(
        <TestProviders>
          <AuditdGenericLine
            id="hello-i-am-an-id"
            contextId="contextid-123"
            text="generic-text-123"
            hostName="host-1"
            session="session-1"
            primary="[username-primary]"
            userName={undefined}
            secondary={undefined}
            processPid={123}
            processName="process-name-1"
            processExecutable="process-1"
            processTitle="process-title-1"
            workingDirectory="working-directory-1"
            args={['arg1', 'arg2', 'arg3']}
            result="success"
          />
        </TestProviders>
      );
      expect(wrapper.text()).toEqual(
        'Sessionsession-1[username-primary]@host-1inworking-directory-1generic-text-123process-name-1(123)arg1arg2arg3process-title-1with resultsuccess'
      );
    });

    test('it returns just a session if only given an id', () => {
      const wrapper = mount(
        <TestProviders>
          <AuditdGenericLine
            id="hello-i-am-an-id"
            contextId="contextid-123"
            text="generic-text-123"
            userName={undefined}
            secondary={undefined}
            session={undefined}
            hostName={undefined}
            primary={undefined}
            processPid={undefined}
            processName={undefined}
            processExecutable={undefined}
            processTitle={undefined}
            workingDirectory={undefined}
            args={undefined}
            result={undefined}
          />
        </TestProviders>
      );
      expect(wrapper.text()).toEqual('Session');
    });

    test('it returns only session and hostName if only hostname and an id is given', () => {
      const wrapper = mount(
        <TestProviders>
          <AuditdGenericLine
            id="hello-i-am-an-id"
            contextId="contextid-123"
            text="generic-text-123"
            hostName="some-host-name"
            userName={undefined}
            secondary={undefined}
            session={undefined}
            primary={undefined}
            processPid={undefined}
            processName={undefined}
            processExecutable={undefined}
            processTitle={undefined}
            workingDirectory={undefined}
            args={undefined}
            result={undefined}
          />
        </TestProviders>
      );
      expect(wrapper.text()).toEqual('Session@some-host-name');
    });

    test('it returns only a session and user name if only a user name and id is given', () => {
      const wrapper = mount(
        <TestProviders>
          <AuditdGenericLine
            id="hello-i-am-an-id"
            contextId="contextid-123"
            text="generic-text-123"
            userName="some-user-name"
            secondary={undefined}
            session={undefined}
            hostName={undefined}
            primary={undefined}
            processPid={undefined}
            processName={undefined}
            processExecutable={undefined}
            processTitle={undefined}
            workingDirectory={undefined}
            args={undefined}
            result={undefined}
          />
        </TestProviders>
      );
      expect(wrapper.text()).toEqual('Sessionsome-user-name');
    });

    test('it returns only a process name if only given a process name and id', () => {
      const wrapper = mount(
        <TestProviders>
          <AuditdGenericLine
            id="hello-i-am-an-id"
            contextId="contextid-123"
            text="generic-text-123"
            userName={undefined}
            processExecutable="some-process-name"
            secondary={undefined}
            session={undefined}
            hostName={undefined}
            primary={undefined}
            processPid={undefined}
            processName={undefined}
            processTitle={undefined}
            workingDirectory={undefined}
            args={undefined}
            result={undefined}
          />
        </TestProviders>
      );
      expect(wrapper.text()).toEqual('Sessiongeneric-text-123some-process-name');
    });

    test('it returns session, user name, and process title if process title with id is given', () => {
      const wrapper = mount(
        <TestProviders>
          <AuditdGenericLine
            id="hello-i-am-an-id"
            contextId="contextid-123"
            text="generic-text-123"
            processTitle="some-process-title"
            userName="some-user-name"
            secondary={undefined}
            session={undefined}
            hostName={undefined}
            primary={undefined}
            processPid={undefined}
            processName={undefined}
            processExecutable={undefined}
            workingDirectory={undefined}
            args={undefined}
            result={undefined}
          />
        </TestProviders>
      );
      expect(wrapper.text()).toEqual('Sessionsome-user-namesome-process-title');
    });

    test('it returns only a working directory if that is all that is given with a id', () => {
      const wrapper = mount(
        <TestProviders>
          <AuditdGenericLine
            id="hello-i-am-an-id"
            contextId="contextid-123"
            text="generic-text-123"
            workingDirectory="some-working-directory"
            userName={undefined}
            secondary={undefined}
            session={undefined}
            hostName={undefined}
            primary={undefined}
            processPid={undefined}
            processName={undefined}
            processExecutable={undefined}
            processTitle={undefined}
            args={undefined}
            result={undefined}
          />
        </TestProviders>
      );
      expect(wrapper.text()).toEqual('Sessioninsome-working-directory');
    });

    test('it returns only the session and args with id if that is all that is given (very unlikely situation)', () => {
      const wrapper = mount(
        <TestProviders>
          <AuditdGenericLine
            id="hello-i-am-an-id"
            contextId="contextid-123"
            text="generic-text-123"
            args={['arg1', 'arg2', 'arg 3']}
            userName={undefined}
            secondary={undefined}
            session={undefined}
            hostName={undefined}
            primary={undefined}
            processPid={undefined}
            processName={undefined}
            processExecutable={undefined}
            processTitle={undefined}
            workingDirectory={undefined}
            result={undefined}
          />
        </TestProviders>
      );
      expect(wrapper.text()).toEqual('Sessionarg1arg2arg 3');
    });
  });
});
