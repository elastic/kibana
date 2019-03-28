/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import toJson from 'enzyme-to-json';
import * as React from 'react';
import { mountWithIntl, shallowWithIntl } from 'test_utils/enzyme_helpers';

import { BrowserFields } from '../../../../containers/source';
import { mockBrowserFields } from '../../../../containers/source/mock';
import { mockEcsData, TestProviders } from '../../../../mock';

import { AuditdLoggedinDetails, AuditdLoggedinLine } from './auditd_loggedin_details';

describe('AuditdLoggedinDetails', () => {
  describe('rendering', () => {
    test('it renders the default AuditdLoggedinDetails', () => {
      // I cannot and do not want to use the BrowserFields mocks for the snapshot tests as they are too heavy
      const browserFields: BrowserFields = {};
      const wrapper = shallowWithIntl(
        <TestProviders>
          <AuditdLoggedinDetails data={mockEcsData[20]} browserFields={browserFields} />
        </TestProviders>
      );
      expect(toJson(wrapper)).toMatchSnapshot();
    });

    test('it returns auditd executed if the data does contain auditd loggedin data', () => {
      const wrapper = mountWithIntl(
        <TestProviders>
          <AuditdLoggedinDetails data={mockEcsData[20]} browserFields={mockBrowserFields} />
        </TestProviders>
      );
      expect(wrapper.text()).toEqual(
        'Session14alice@zeek-londonattempted a login via/usr/sbin/sshdwith resultsuccessSource8.42.77.171'
      );
    });

    test('it returns null for text if the data contains no auditd loggedin data', () => {
      const wrapper = mountWithIntl(
        <TestProviders>
          <AuditdLoggedinDetails data={mockEcsData[0]} browserFields={mockBrowserFields} />
        </TestProviders>
      );
      expect(wrapper.text()).toBeNull();
    });
  });

  // NOTE: It's best if all the arguments are sent into this function and they typically should be otherwise
  // you have something wrong with your beats. These tests are to ensure the function does not
  // crash. If you need to format things prettier because not all the data is there, then update
  // these tests with those changes.
  describe('#AuditdLoggedinLine', () => {
    test('it returns pretty output if you send in all your happy path data', () => {
      const wrapper = mountWithIntl(
        <TestProviders>
          <AuditdLoggedinLine
            id="hello-i-am-an-id"
            hostName="host-1"
            result="success"
            session="session-1"
            userName="username-1"
            primary="username-2"
            secondary="username-3"
            processExecutable="executable-1"
          />
        </TestProviders>
      );
      expect(wrapper.text()).toEqual(
        'Sessionsession-1username-2asusername-3@host-1attempted a login viaexecutable-1with resultsuccess'
      );
    });
    test('it returns a session with username if username, primary, and secondary all equal each other ', () => {
      const wrapper = mountWithIntl(
        <TestProviders>
          <AuditdLoggedinLine
            id="hello-i-am-an-id"
            hostName="host-1"
            result="success"
            session="session-1"
            userName="username-1"
            primary="username-1"
            secondary="username-1"
            processExecutable="executable-1"
          />
        </TestProviders>
      );
      expect(wrapper.text()).toEqual(
        'Sessionsession-1username-1@host-1attempted a login viaexecutable-1with resultsuccess'
      );
    });

    test('it returns a session with username if primary and secondary equal unset', () => {
      const wrapper = mountWithIntl(
        <TestProviders>
          <AuditdLoggedinLine
            id="hello-i-am-an-id"
            hostName="host-1"
            result="success"
            session="session-1"
            userName="username-1"
            primary="unset"
            secondary="unset"
            processExecutable="executable-1"
          />
        </TestProviders>
      );
      expect(wrapper.text()).toEqual(
        'Sessionsession-1username-1@host-1attempted a login viaexecutable-1with resultsuccess'
      );
    });

    test('it returns a session with username if primary and secondary equal unset with different casing', () => {
      const wrapper = mountWithIntl(
        <TestProviders>
          <AuditdLoggedinLine
            id="hello-i-am-an-id"
            hostName="host-1"
            result="success"
            session="session-1"
            userName="username-1"
            primary="unsEt"
            secondary="uNset"
            processExecutable="executable-1"
          />
        </TestProviders>
      );
      expect(wrapper.text()).toEqual(
        'Sessionsession-1username-1@host-1attempted a login viaexecutable-1with resultsuccess'
      );
    });

    test('it returns a session with username if primary and secondary are undefined', () => {
      const wrapper = mountWithIntl(
        <TestProviders>
          <AuditdLoggedinLine
            id="hello-i-am-an-id"
            hostName="host-1"
            result="success"
            session="session-1"
            userName="username-1"
            processExecutable="executable-1"
            primary={undefined}
            secondary={undefined}
          />
        </TestProviders>
      );
      expect(wrapper.text()).toEqual(
        'Sessionsession-1username-1@host-1attempted a login viaexecutable-1with resultsuccess'
      );
    });

    test('it returns a session with "as" wording if username, primary, and secondary are all different', () => {
      const wrapper = mountWithIntl(
        <TestProviders>
          <AuditdLoggedinLine
            id="hello-i-am-an-id"
            hostName="host-1"
            userName="[username]"
            primary="[primary]"
            secondary="[secondary]"
            result="success"
            session="session-1"
            processExecutable="executable-1"
          />
        </TestProviders>
      );
      expect(wrapper.text()).toEqual(
        'Sessionsession-1[primary]as[secondary]@host-1attempted a login viaexecutable-1with resultsuccess'
      );
    });

    test('it returns a session with "as" wording if username and primary are the same but secondary is different', () => {
      const wrapper = mountWithIntl(
        <TestProviders>
          <AuditdLoggedinLine
            id="hello-i-am-an-id"
            hostName="host-1"
            userName="username-1"
            primary="username-1"
            secondary="username-2"
            result="success"
            session="session-1"
            processExecutable="executable-1"
          />
        </TestProviders>
      );
      expect(wrapper.text()).toEqual(
        'Sessionsession-1username-1asusername-2@host-1attempted a login viaexecutable-1with resultsuccess'
      );
    });

    test('it returns a session with primary if username and secondary are unset with different casing', () => {
      const wrapper = mountWithIntl(
        <TestProviders>
          <AuditdLoggedinLine
            id="hello-i-am-an-id"
            hostName="host-1"
            userName="UnSet"
            primary="username-1"
            secondary="UnSET"
            result="success"
            session="session-1"
            processExecutable="executable-1"
          />
        </TestProviders>
      );
      expect(wrapper.text()).toEqual(
        'Sessionsession-1username-1@host-1attempted a login viaexecutable-1with resultsuccess'
      );
    });

    test('it returns a session with primary if username and secondary are undefined', () => {
      const wrapper = mountWithIntl(
        <TestProviders>
          <AuditdLoggedinLine
            id="hello-i-am-an-id"
            hostName="host-1"
            primary="username-1"
            result="success"
            session="session-1"
            userName="username-1"
            processExecutable="executable-1"
            secondary={undefined}
          />
        </TestProviders>
      );
      expect(wrapper.text()).toEqual(
        'Sessionsession-1username-1@host-1attempted a login viaexecutable-1with resultsuccess'
      );
    });

    test('it returns only Session if you just send in an id', () => {
      const wrapper = mountWithIntl(
        <TestProviders>
          <AuditdLoggedinLine
            id={'hello-i-am-an-id'}
            hostName={undefined}
            primary={undefined}
            result={undefined}
            session={undefined}
            userName={undefined}
            processExecutable={undefined}
            secondary={undefined}
          />
        </TestProviders>
      );
      expect(wrapper.text()).toEqual('Session');
    });

    test('it returns only session and some host name just send in an id and hostName', () => {
      const wrapper = mountWithIntl(
        <TestProviders>
          <AuditdLoggedinLine
            id={'hello-i-am-an-id'}
            hostName={'some-host-name'}
            primary={undefined}
            result={undefined}
            session={undefined}
            userName={undefined}
            processExecutable={undefined}
            secondary={undefined}
          />
        </TestProviders>
      );
      expect(wrapper.text()).toEqual('Session@some-host-name');
    });

    test('it returns only session and some-user-name if that is all you sent in', () => {
      const wrapper = mountWithIntl(
        <TestProviders>
          <AuditdLoggedinLine
            id={'hello-i-am-an-id'}
            userName={'some-user-name'}
            hostName={undefined}
            primary={undefined}
            result={undefined}
            session={undefined}
            processExecutable={undefined}
            secondary={undefined}
          />
        </TestProviders>
      );
      expect(wrapper.text()).toEqual('Sessionsome-user-name');
    });

    test('it returns only processExecutable some-process-name if that is all you sent in', () => {
      const wrapper = mountWithIntl(
        <TestProviders>
          <AuditdLoggedinLine
            id={'hello-i-am-an-id'}
            processExecutable={'some-process-name'}
            hostName={undefined}
            primary={undefined}
            result={undefined}
            session={undefined}
            userName={undefined}
            secondary={undefined}
          />
        </TestProviders>
      );
      expect(wrapper.text()).toEqual('Sessionattempted a login viasome-process-name');
    });

    test('it returns only the session-1 if that is all that is sent in', () => {
      const wrapper = mountWithIntl(
        <TestProviders>
          <AuditdLoggedinLine
            id={'hello-i-am-an-id'}
            session={'session-1'}
            hostName={undefined}
            primary={undefined}
            result={undefined}
            userName={undefined}
            processExecutable={undefined}
            secondary={undefined}
          />
        </TestProviders>
      );
      expect(wrapper.text()).toEqual('Sessionsession-1');
    });

    test('it returns only the result if that is all that is sent in', () => {
      const wrapper = mountWithIntl(
        <TestProviders>
          <AuditdLoggedinLine
            id={'hello-i-am-an-id'}
            result={'failure'}
            hostName={undefined}
            primary={undefined}
            session={undefined}
            userName={undefined}
            processExecutable={undefined}
            secondary={undefined}
          />
        </TestProviders>
      );
      expect(wrapper.text()).toEqual('Sessionwith resultfailure');
    });
  });
});
