/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { shallow } from 'enzyme';
import React from 'react';

import { BrowserFields } from '../../../../../containers/source';
import { mockBrowserFields } from '../../../../../containers/source/mock';
import { mockTimelineData, TestProviders } from '../../../../../mock';
import { SystemGenericDetails, SystemGenericLine } from './generic_details';
import { useMountAppended } from '../../../../../utils/use_mount_appended';

describe('SystemGenericDetails', () => {
  const mount = useMountAppended();

  describe('rendering', () => {
    test('it renders the default SystemGenericDetails', () => {
      // I cannot and do not want to use BrowserFields for the mocks for the snapshot tests as they are too heavy
      const browserFields: BrowserFields = {};
      const wrapper = shallow(
        <SystemGenericDetails
          contextId="[contextid-123]"
          text="[generic-text-123]"
          browserFields={browserFields}
          data={mockTimelineData[28].ecs}
          timelineId="test"
        />
      );
      expect(wrapper).toMatchSnapshot();
    });

    test('it returns system rendering if the data does contain system data', () => {
      const wrapper = mount(
        <TestProviders>
          <SystemGenericDetails
            contextId="[contextid-123]"
            text="[generic-text-123]"
            browserFields={mockBrowserFields}
            data={mockTimelineData[28].ecs}
            timelineId="test"
          />
        </TestProviders>
      );
      expect(wrapper.text()).toEqual(
        'Braden@zeek-london[generic-text-123](6278)with resultfailureSource128.199.212.120'
      );
    });
  });

  describe('#SystemGenericLine', () => {
    test('it returns pretty output if you send in all your happy path data', () => {
      const wrapper = mount(
        <TestProviders>
          <div>
            <SystemGenericLine
              contextId="[context-123]"
              hostName="[hostname-123]"
              id="[id-123]"
              message="[message-123]"
              outcome="[outcome-123]"
              packageName="[packageName-123]"
              packageSummary="[packageSummary-123]"
              packageVersion="[packageVersion-123]"
              processExecutable="[packageExecutable=123]"
              processPid={123}
              processName="[processName-123]"
              sshMethod="[sshMethod-123]"
              sshSignature="[sshSignature-123]"
              text="[generic-text-123]"
              userDomain="[userDomain-123]"
              userName="[username-123]"
              workingDirectory="[working-directory-123]"
            />
          </div>
        </TestProviders>
      );
      expect(wrapper.text()).toEqual(
        '[username-123]\\[userDomain-123]@[hostname-123]in[working-directory-123][generic-text-123][processName-123](123)with result[outcome-123][sshSignature-123][sshMethod-123][packageName-123][packageVersion-123][packageSummary-123][message-123]'
      );
    });

    test('it returns nothing if data is all null', () => {
      const wrapper = mount(
        <TestProviders>
          <div>
            <SystemGenericLine
              contextId="[context-123]"
              hostName={null}
              id="[id-123]"
              message={null}
              outcome={null}
              packageName={null}
              packageSummary={null}
              packageVersion={null}
              processExecutable={null}
              processPid={null}
              processName={null}
              sshMethod={null}
              sshSignature={null}
              text={null}
              userDomain={null}
              userName={null}
              workingDirectory={null}
            />
          </div>
        </TestProviders>
      );
      expect(wrapper.text()).toEqual('');
    });

    test('it can return only the host name', () => {
      const wrapper = mount(
        <TestProviders>
          <div>
            <SystemGenericLine
              contextId="[context-123]"
              hostName="[hostname-123]"
              id="[id-123]"
              message={null}
              outcome={null}
              packageName={null}
              packageSummary={null}
              packageVersion={null}
              processExecutable={null}
              processPid={null}
              processName={null}
              sshMethod={null}
              sshSignature={null}
              text={null}
              userDomain={null}
              userName={null}
              workingDirectory={null}
            />
          </div>
        </TestProviders>
      );
      expect(wrapper.text()).toEqual('[hostname-123]');
    });

    test('it can return the host, message', () => {
      const wrapper = mount(
        <TestProviders>
          <div>
            <SystemGenericLine
              contextId="[context-123]"
              hostName="[hostname-123]"
              id="[id-123]"
              message="[message-123]"
              outcome={null}
              packageName={null}
              packageSummary={null}
              packageVersion={null}
              processExecutable={null}
              processPid={null}
              processName={null}
              sshMethod={null}
              sshSignature={null}
              text={null}
              userDomain={null}
              userName={null}
              workingDirectory={null}
            />
          </div>
        </TestProviders>
      );
      expect(wrapper.text()).toEqual('[hostname-123][message-123]');
    });

    test('it can return the host, message, outcome', () => {
      const wrapper = mount(
        <TestProviders>
          <div>
            <SystemGenericLine
              contextId="[context-123]"
              hostName="[hostname-123]"
              id="[id-123]"
              message="[message-123]"
              outcome="[outcome-123]"
              packageName={null}
              packageSummary={null}
              packageVersion={null}
              processExecutable={null}
              processPid={null}
              processName={null}
              sshMethod={null}
              sshSignature={null}
              text={null}
              userDomain={null}
              userName={null}
              workingDirectory={null}
            />
          </div>
        </TestProviders>
      );
      expect(wrapper.text()).toEqual('[hostname-123]with result[outcome-123][message-123]');
    });

    test('it can return the host, message, outcome, packageName', () => {
      const wrapper = mount(
        <TestProviders>
          <div>
            <SystemGenericLine
              contextId="[context-123]"
              hostName="[hostname-123]"
              id="[id-123]"
              message="[message-123]"
              outcome="[outcome-123]"
              packageName="[packageName-123]"
              packageSummary={null}
              packageVersion={null}
              processExecutable={null}
              processPid={null}
              processName={null}
              sshMethod={null}
              sshSignature={null}
              text={null}
              userDomain={null}
              userName={null}
              workingDirectory={null}
            />
          </div>
        </TestProviders>
      );
      expect(wrapper.text()).toEqual(
        '[hostname-123]with result[outcome-123][packageName-123][message-123]'
      );
    });

    test('it can return the host, message, outcome, packageName, pacakgeSummary', () => {
      const wrapper = mount(
        <TestProviders>
          <div>
            <SystemGenericLine
              contextId="[context-123]"
              hostName="[hostname-123]"
              id="[id-123]"
              message="[message-123]"
              outcome="[outcome-123]"
              packageName="[packageName-123]"
              packageSummary="[packageSummary-123]"
              packageVersion={null}
              processExecutable={null}
              processPid={null}
              processName={null}
              sshMethod={null}
              sshSignature={null}
              text={null}
              userDomain={null}
              userName={null}
              workingDirectory={null}
            />
          </div>
        </TestProviders>
      );
      expect(wrapper.text()).toEqual(
        '[hostname-123]with result[outcome-123][packageName-123][packageSummary-123][message-123]'
      );
    });

    test('it can return the host, message, outcome, packageName, pacakgeSummary, packageVersion', () => {
      const wrapper = mount(
        <TestProviders>
          <div>
            <SystemGenericLine
              contextId="[context-123]"
              hostName="[hostname-123]"
              id="[id-123]"
              message="[message-123]"
              outcome="[outcome-123]"
              packageName="[packageName-123]"
              packageSummary="[packageSummary-123]"
              packageVersion="[packageVersion-123]"
              processExecutable={null}
              processPid={null}
              processName={null}
              sshMethod={null}
              sshSignature={null}
              text={null}
              userDomain={null}
              userName={null}
              workingDirectory={null}
            />
          </div>
        </TestProviders>
      );
      expect(wrapper.text()).toEqual(
        '[hostname-123]with result[outcome-123][packageName-123][packageVersion-123][packageSummary-123][message-123]'
      );
    });

    test('it can return the host, message, outcome, packageName, pacakgeSummary, packageVersion, packageExecutable', () => {
      const wrapper = mount(
        <TestProviders>
          <div>
            <SystemGenericLine
              contextId="[context-123]"
              hostName="[hostname-123]"
              id="[id-123]"
              message="[message-123]"
              outcome="[outcome-123]"
              packageName="[packageName-123]"
              packageSummary="[packageSummary-123]"
              packageVersion="[packageVersion-123]"
              processExecutable="[processExecutable-123]"
              processPid={null}
              processName={null}
              sshMethod={null}
              sshSignature={null}
              text={null}
              userDomain={null}
              userName={null}
              workingDirectory={null}
            />
          </div>
        </TestProviders>
      );
      expect(wrapper.text()).toEqual(
        '[hostname-123][processExecutable-123]with result[outcome-123][packageName-123][packageVersion-123][packageSummary-123][message-123]'
      );
    });

    test('it can return the host, message, outcome, packageName, pacakgeSummary, packageVersion, packageExecutable, processPid', () => {
      const wrapper = mount(
        <TestProviders>
          <div>
            <SystemGenericLine
              contextId="[context-123]"
              hostName="[hostname-123]"
              id="[id-123]"
              message="[message-123]"
              outcome="[outcome-123]"
              packageName="[packageName-123]"
              packageSummary="[packageSummary-123]"
              packageVersion="[packageVersion-123]"
              processExecutable="[processExecutable-123]"
              processPid={123}
              processName={null}
              sshMethod={null}
              sshSignature={null}
              text={null}
              userDomain={null}
              userName={null}
              workingDirectory={null}
            />
          </div>
        </TestProviders>
      );
      expect(wrapper.text()).toEqual(
        '[hostname-123][processExecutable-123](123)with result[outcome-123][packageName-123][packageVersion-123][packageSummary-123][message-123]'
      );
    });

    test('it can return the host, message, outcome, packageName, pacakgeSummary, packageVersion, packageExecutable, processPid, processName', () => {
      const wrapper = mount(
        <TestProviders>
          <div>
            <SystemGenericLine
              contextId="[context-123]"
              hostName="[hostname-123]"
              id="[id-123]"
              message="[message-123]"
              outcome="[outcome-123]"
              packageName="[packageName-123]"
              packageSummary="[packageSummary-123]"
              packageVersion="[packageVersion-123]"
              processExecutable="[processExecutable-123]"
              processPid={123}
              processName="[processName-123]"
              sshMethod={null}
              sshSignature={null}
              text={null}
              userDomain={null}
              userName={null}
              workingDirectory={null}
            />
          </div>
        </TestProviders>
      );
      expect(wrapper.text()).toEqual(
        '[hostname-123][processName-123](123)with result[outcome-123][packageName-123][packageVersion-123][packageSummary-123][message-123]'
      );
    });

    test('it can return the host, message, outcome, packageName, pacakgeSummary, packageVersion, packageExecutable, processPid, processName, sshMethod', () => {
      const wrapper = mount(
        <TestProviders>
          <div>
            <SystemGenericLine
              contextId="[context-123]"
              hostName="[hostname-123]"
              id="[id-123]"
              message="[message-123]"
              outcome="[outcome-123]"
              packageName="[packageName-123]"
              packageSummary="[packageSummary-123]"
              packageVersion="[packageVersion-123]"
              processExecutable="[processExecutable-123]"
              processPid={123}
              processName="[processName-123]"
              sshMethod="[sshMethod-123]"
              sshSignature={null}
              text={null}
              userDomain={null}
              userName={null}
              workingDirectory={null}
            />
          </div>
        </TestProviders>
      );
      expect(wrapper.text()).toEqual(
        '[hostname-123][processName-123](123)with result[outcome-123][sshMethod-123][packageName-123][packageVersion-123][packageSummary-123][message-123]'
      );
    });

    test('it can return the host, message, outcome, packageName, pacakgeSummary, packageVersion, packageExecutable, processPid, processName, sshMethod, sshSignature', () => {
      const wrapper = mount(
        <TestProviders>
          <div>
            <SystemGenericLine
              contextId="[context-123]"
              hostName="[hostname-123]"
              id="[id-123]"
              message="[message-123]"
              outcome="[outcome-123]"
              packageName="[packageName-123]"
              packageSummary="[packageSummary-123]"
              packageVersion="[packageVersion-123]"
              processExecutable="[processExecutable-123]"
              processPid={123}
              processName="[processName-123]"
              sshMethod="[sshMethod-123]"
              sshSignature="[sshSignature-123]"
              text={null}
              userDomain={null}
              userName={null}
              workingDirectory={null}
            />
          </div>
        </TestProviders>
      );
      expect(wrapper.text()).toEqual(
        '[hostname-123][processName-123](123)with result[outcome-123][sshSignature-123][sshMethod-123][packageName-123][packageVersion-123][packageSummary-123][message-123]'
      );
    });

    test('it can return the host, message, outcome, packageName, pacakgeSummary, packageVersion, packageExecutable, processPid, processName, sshMethod, sshSignature, text', () => {
      const wrapper = mount(
        <TestProviders>
          <div>
            <SystemGenericLine
              contextId="[context-123]"
              hostName="[hostname-123]"
              id="[id-123]"
              message="[message-123]"
              outcome="[outcome-123]"
              packageName="[packageName-123]"
              packageSummary="[packageSummary-123]"
              packageVersion="[packageVersion-123]"
              processExecutable="[processExecutable-123]"
              processPid={123}
              processName="[processName-123]"
              sshMethod="[sshMethod-123]"
              sshSignature="[sshSignature-123]"
              text="[text-123]"
              userDomain={null}
              userName={null}
              workingDirectory={null}
            />
          </div>
        </TestProviders>
      );
      expect(wrapper.text()).toEqual(
        '[hostname-123][text-123][processName-123](123)with result[outcome-123][sshSignature-123][sshMethod-123][packageName-123][packageVersion-123][packageSummary-123][message-123]'
      );
    });

    test('it can return the host, message, outcome, packageName, pacakgeSummary, packageVersion, packageExecutable, processPid, processName, sshMethod, sshSignature, text, userDomain, username', () => {
      const wrapper = mount(
        <TestProviders>
          <div>
            <SystemGenericLine
              contextId="[context-123]"
              hostName="[hostname-123]"
              id="[id-123]"
              message="[message-123]"
              outcome="[outcome-123]"
              packageName="[packageName-123]"
              packageSummary="[packageSummary-123]"
              packageVersion="[packageVersion-123]"
              processExecutable="[processExecutable-123]"
              processPid={123}
              processName="[processName-123]"
              sshMethod="[sshMethod-123]"
              sshSignature="[sshSignature-123]"
              text="[text-123]"
              userDomain="[userDomain-123]"
              userName="[username-123]"
              workingDirectory={null}
            />
          </div>
        </TestProviders>
      );
      expect(wrapper.text()).toEqual(
        '[username-123]\\[userDomain-123]@[hostname-123][text-123][processName-123](123)with result[outcome-123][sshSignature-123][sshMethod-123][packageName-123][packageVersion-123][packageSummary-123][message-123]'
      );
    });

    test('it can return the host, message, outcome, packageName, pacakgeSummary, packageVersion, packageExecutable, processPid, processName, sshMethod, sshSignature, text, userDomain, username, working-directory', () => {
      const wrapper = mount(
        <TestProviders>
          <div>
            <SystemGenericLine
              contextId="[context-123]"
              hostName="[hostname-123]"
              id="[id-123]"
              message="[message-123]"
              outcome="[outcome-123]"
              packageName="[packageName-123]"
              packageSummary="[packageSummary-123]"
              packageVersion="[packageVersion-123]"
              processExecutable="[processExecutable-123]"
              processPid={123}
              processName="[processName-123]"
              sshMethod="[sshMethod-123]"
              sshSignature="[sshSignature-123]"
              text="[text-123]"
              userDomain="[userDomain-123]"
              userName="[username-123]"
              workingDirectory="[working-directory-123]"
            />
          </div>
        </TestProviders>
      );
      expect(wrapper.text()).toEqual(
        '[username-123]\\[userDomain-123]@[hostname-123]in[working-directory-123][text-123][processName-123](123)with result[outcome-123][sshSignature-123][sshMethod-123][packageName-123][packageVersion-123][packageSummary-123][message-123]'
      );
    });
  });
});
