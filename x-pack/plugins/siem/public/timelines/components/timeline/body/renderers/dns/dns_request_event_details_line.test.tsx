/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';

import { TestProviders } from '../../../../../../common/mock';

import { DnsRequestEventDetailsLine } from './dns_request_event_details_line';
import { useMountAppended } from '../../../../../../common/utils/use_mount_appended';

describe('DnsRequestEventDetailsLine', () => {
  const mount = useMountAppended();

  test('it renders the expected text when all properties are provided', () => {
    const wrapper = mount(
      <TestProviders>
        <DnsRequestEventDetailsLine
          contextId="test"
          dnsQuestionName="[dnsQuestionName]"
          dnsQuestionType="[dnsQuestionType]"
          dnsResolvedIp="[dnsResolvedIp]"
          dnsResponseCode="[dnsResponseCode]"
          eventCode="[eventCode]"
          hostName="[hostName]"
          id="1"
          processExecutable="[processExecutable]"
          processName="[processName]"
          processPid={123}
          userDomain="[userDomain]"
          userName="[userName]"
          winlogEventId="[winlogEventId]"
        />
      </TestProviders>
    );
    expect(wrapper.text()).toEqual(
      '[userName]\\[userDomain]@[hostName]asked for[dnsQuestionName]with question type[dnsQuestionType], which resolved to[dnsResolvedIp](response code:[dnsResponseCode])via[processName](123)[eventCode]'
    );
  });

  test('it renders the expected text when dnsQuestionName is NOT provided', () => {
    const wrapper = mount(
      <TestProviders>
        <DnsRequestEventDetailsLine
          contextId="test"
          dnsQuestionName={undefined}
          dnsQuestionType="[dnsQuestionType]"
          dnsResolvedIp="[dnsResolvedIp]"
          dnsResponseCode="[dnsResponseCode]"
          eventCode="[eventCode]"
          hostName="[hostName]"
          id="1"
          processExecutable="[processExecutable]"
          processName="[processName]"
          processPid={123}
          userDomain="[userDomain]"
          userName="[userName]"
          winlogEventId="[winlogEventId]"
        />
      </TestProviders>
    );
    expect(wrapper.text()).toEqual(
      '[userName]\\[userDomain]@[hostName]with question type[dnsQuestionType], which resolved to[dnsResolvedIp](response code:[dnsResponseCode])via[processName](123)[eventCode]'
    );
  });

  test('it renders the expected text when dnsQuestionType is NOT provided', () => {
    const wrapper = mount(
      <TestProviders>
        <DnsRequestEventDetailsLine
          contextId="test"
          dnsQuestionName="[dnsQuestionName]"
          dnsQuestionType={undefined}
          dnsResolvedIp="[dnsResolvedIp]"
          dnsResponseCode="[dnsResponseCode]"
          eventCode="[eventCode]"
          hostName="[hostName]"
          id="1"
          processExecutable="[processExecutable]"
          processName="[processName]"
          processPid={123}
          userDomain="[userDomain]"
          userName="[userName]"
          winlogEventId="[winlogEventId]"
        />
      </TestProviders>
    );
    expect(wrapper.text()).toEqual(
      '[userName]\\[userDomain]@[hostName]asked for[dnsQuestionName], which resolved to[dnsResolvedIp](response code:[dnsResponseCode])via[processName](123)[eventCode]'
    );
  });

  test('it renders the expected text when dnsResolvedIp is NOT provided', () => {
    const wrapper = mount(
      <TestProviders>
        <DnsRequestEventDetailsLine
          contextId="test"
          dnsQuestionName="[dnsQuestionName]"
          dnsQuestionType="[dnsQuestionType]"
          dnsResolvedIp={undefined}
          dnsResponseCode="[dnsResponseCode]"
          eventCode="[eventCode]"
          hostName="[hostName]"
          id="1"
          processExecutable="[processExecutable]"
          processName="[processName]"
          processPid={123}
          userDomain="[userDomain]"
          userName="[userName]"
          winlogEventId="[winlogEventId]"
        />
      </TestProviders>
    );
    expect(wrapper.text()).toEqual(
      '[userName]\\[userDomain]@[hostName]asked for[dnsQuestionName]with question type[dnsQuestionType](response code:[dnsResponseCode])via[processName](123)[eventCode]'
    );
  });

  test('it renders the expected text when dnsResponseCode is NOT provided', () => {
    const wrapper = mount(
      <TestProviders>
        <DnsRequestEventDetailsLine
          contextId="test"
          dnsQuestionName="[dnsQuestionName]"
          dnsQuestionType="[dnsQuestionType]"
          dnsResolvedIp="[dnsResolvedIp]"
          dnsResponseCode={undefined}
          eventCode="[eventCode]"
          hostName="[hostName]"
          id="1"
          processExecutable="[processExecutable]"
          processName="[processName]"
          processPid={123}
          userDomain="[userDomain]"
          userName="[userName]"
          winlogEventId="[winlogEventId]"
        />
      </TestProviders>
    );
    expect(wrapper.text()).toEqual(
      '[userName]\\[userDomain]@[hostName]asked for[dnsQuestionName]with question type[dnsQuestionType], which resolved to[dnsResolvedIp]via[processName](123)[eventCode]'
    );
  });

  test('it renders the expected text when eventCode is NOT provided', () => {
    const wrapper = mount(
      <TestProviders>
        <DnsRequestEventDetailsLine
          contextId="test"
          dnsQuestionName="[dnsQuestionName]"
          dnsQuestionType="[dnsQuestionType]"
          dnsResolvedIp="[dnsResolvedIp]"
          dnsResponseCode="[dnsResponseCode]"
          eventCode={undefined}
          hostName="[hostName]"
          id="1"
          processExecutable="[processExecutable]"
          processName="[processName]"
          processPid={123}
          userDomain="[userDomain]"
          userName="[userName]"
          winlogEventId="[winlogEventId]"
        />
      </TestProviders>
    );
    expect(wrapper.text()).toEqual(
      '[userName]\\[userDomain]@[hostName]asked for[dnsQuestionName]with question type[dnsQuestionType], which resolved to[dnsResolvedIp](response code:[dnsResponseCode])via[processName](123)[winlogEventId]'
    );
  });

  test('it renders the expected text when hostName is NOT provided', () => {
    const wrapper = mount(
      <TestProviders>
        <DnsRequestEventDetailsLine
          contextId="test"
          dnsQuestionName="[dnsQuestionName]"
          dnsQuestionType="[dnsQuestionType]"
          dnsResolvedIp="[dnsResolvedIp]"
          dnsResponseCode="[dnsResponseCode]"
          eventCode="[eventCode]"
          hostName={undefined}
          id="1"
          processExecutable="[processExecutable]"
          processName="[processName]"
          processPid={123}
          userDomain="[userDomain]"
          userName="[userName]"
          winlogEventId="[winlogEventId]"
        />
      </TestProviders>
    );
    expect(wrapper.text()).toEqual(
      '[userName]\\[userDomain]asked for[dnsQuestionName]with question type[dnsQuestionType], which resolved to[dnsResolvedIp](response code:[dnsResponseCode])via[processName](123)[eventCode]'
    );
  });

  test('it renders the expected text when processExecutable is NOT provided', () => {
    const wrapper = mount(
      <TestProviders>
        <DnsRequestEventDetailsLine
          contextId="test"
          dnsQuestionName="[dnsQuestionName]"
          dnsQuestionType="[dnsQuestionType]"
          dnsResolvedIp="[dnsResolvedIp]"
          dnsResponseCode="[dnsResponseCode]"
          eventCode="[eventCode]"
          hostName="[hostName]"
          id="1"
          processExecutable={undefined}
          processName="[processName]"
          processPid={123}
          userDomain="[userDomain]"
          userName="[userName]"
          winlogEventId="[winlogEventId]"
        />
      </TestProviders>
    );
    expect(wrapper.text()).toEqual(
      '[userName]\\[userDomain]@[hostName]asked for[dnsQuestionName]with question type[dnsQuestionType], which resolved to[dnsResolvedIp](response code:[dnsResponseCode])via[processName](123)[eventCode]'
    );
  });

  test('it renders the expected text when processName is NOT provided', () => {
    const wrapper = mount(
      <TestProviders>
        <DnsRequestEventDetailsLine
          contextId="test"
          dnsQuestionName="[dnsQuestionName]"
          dnsQuestionType="[dnsQuestionType]"
          dnsResolvedIp="[dnsResolvedIp]"
          dnsResponseCode="[dnsResponseCode]"
          eventCode="[eventCode]"
          hostName="[hostName]"
          id="1"
          processExecutable="[processExecutable]"
          processName={undefined}
          processPid={123}
          userDomain="[userDomain]"
          userName="[userName]"
          winlogEventId="[winlogEventId]"
        />
      </TestProviders>
    );
    expect(wrapper.text()).toEqual(
      '[userName]\\[userDomain]@[hostName]asked for[dnsQuestionName]with question type[dnsQuestionType], which resolved to[dnsResolvedIp](response code:[dnsResponseCode])via[processExecutable](123)[eventCode]'
    );
  });

  test('it renders the expected text when processPid is NOT provided', () => {
    const wrapper = mount(
      <TestProviders>
        <DnsRequestEventDetailsLine
          contextId="test"
          dnsQuestionName="[dnsQuestionName]"
          dnsQuestionType="[dnsQuestionType]"
          dnsResolvedIp="[dnsResolvedIp]"
          dnsResponseCode="[dnsResponseCode]"
          eventCode="[eventCode]"
          hostName="[hostName]"
          id="1"
          processExecutable="[processExecutable]"
          processName="[processName]"
          processPid={undefined}
          userDomain="[userDomain]"
          userName="[userName]"
          winlogEventId="[winlogEventId]"
        />
      </TestProviders>
    );
    expect(wrapper.text()).toEqual(
      '[userName]\\[userDomain]@[hostName]asked for[dnsQuestionName]with question type[dnsQuestionType], which resolved to[dnsResolvedIp](response code:[dnsResponseCode])via[processName][eventCode]'
    );
  });

  test('it renders the expected text when userDomain is NOT provided', () => {
    const wrapper = mount(
      <TestProviders>
        <DnsRequestEventDetailsLine
          contextId="test"
          dnsQuestionName="[dnsQuestionName]"
          dnsQuestionType="[dnsQuestionType]"
          dnsResolvedIp="[dnsResolvedIp]"
          dnsResponseCode="[dnsResponseCode]"
          eventCode="[eventCode]"
          hostName="[hostName]"
          id="1"
          processExecutable="[processExecutable]"
          processName="[processName]"
          processPid={123}
          userDomain={undefined}
          userName="[userName]"
          winlogEventId="[winlogEventId]"
        />
      </TestProviders>
    );
    expect(wrapper.text()).toEqual(
      '[userName]@[hostName]asked for[dnsQuestionName]with question type[dnsQuestionType], which resolved to[dnsResolvedIp](response code:[dnsResponseCode])via[processName](123)[eventCode]'
    );
  });

  test('it renders the expected text when userName is NOT provided', () => {
    const wrapper = mount(
      <TestProviders>
        <DnsRequestEventDetailsLine
          contextId="test"
          dnsQuestionName="[dnsQuestionName]"
          dnsQuestionType="[dnsQuestionType]"
          dnsResolvedIp="[dnsResolvedIp]"
          dnsResponseCode="[dnsResponseCode]"
          eventCode="[eventCode]"
          hostName="[hostName]"
          id="1"
          processExecutable="[processExecutable]"
          processName="[processName]"
          processPid={123}
          userDomain="[userDomain]"
          userName={undefined}
          winlogEventId="[winlogEventId]"
        />
      </TestProviders>
    );
    expect(wrapper.text()).toEqual(
      '\\[userDomain][hostName]asked for[dnsQuestionName]with question type[dnsQuestionType], which resolved to[dnsResolvedIp](response code:[dnsResponseCode])via[processName](123)[eventCode]'
    );
  });

  test('it renders the expected text when winlogEventId is NOT provided', () => {
    const wrapper = mount(
      <TestProviders>
        <DnsRequestEventDetailsLine
          contextId="test"
          dnsQuestionName="[dnsQuestionName]"
          dnsQuestionType="[dnsQuestionType]"
          dnsResolvedIp="[dnsResolvedIp]"
          dnsResponseCode="[dnsResponseCode]"
          eventCode="[eventCode]"
          hostName="[hostName]"
          id="1"
          processExecutable="[processExecutable]"
          processName="[processName]"
          processPid={123}
          userDomain="[userDomain]"
          userName="[userName]"
          winlogEventId={undefined}
        />
      </TestProviders>
    );
    expect(wrapper.text()).toEqual(
      '[userName]\\[userDomain]@[hostName]asked for[dnsQuestionName]with question type[dnsQuestionType], which resolved to[dnsResolvedIp](response code:[dnsResponseCode])via[processName](123)[eventCode]'
    );
  });

  test('it renders the expected text when both eventCode and winlogEventId are NOT provided', () => {
    const wrapper = mount(
      <TestProviders>
        <DnsRequestEventDetailsLine
          contextId="test"
          dnsQuestionName="[dnsQuestionName]"
          dnsQuestionType="[dnsQuestionType]"
          dnsResolvedIp="[dnsResolvedIp]"
          dnsResponseCode="[dnsResponseCode]"
          eventCode={null}
          hostName="[hostName]"
          id="1"
          processExecutable="[processExecutable]"
          processName="[processName]"
          processPid={123}
          userDomain="[userDomain]"
          userName="[userName]"
          winlogEventId={undefined}
        />
      </TestProviders>
    );
    expect(wrapper.text()).toEqual(
      '[userName]\\[userDomain]@[hostName]asked for[dnsQuestionName]with question type[dnsQuestionType], which resolved to[dnsResolvedIp](response code:[dnsResponseCode])via[processName](123)'
    );
  });
});
