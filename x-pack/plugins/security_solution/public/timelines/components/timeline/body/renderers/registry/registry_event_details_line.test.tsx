/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import { TestProviders } from '../../../../../../common/mock';
import { useMountAppended } from '../../../../../../common/utils/use_mount_appended';
import { RegistryEventDetailsLine } from './registry_event_details_line';
import { MODIFIED_REGISTRY_KEY } from '../system/translations';

jest.mock('../../../../../../common/lib/kibana');

jest.mock('@elastic/eui', () => {
  const original = jest.requireActual('@elastic/eui');
  return {
    ...original,
    EuiScreenReaderOnly: () => <></>,
  };
});

describe('DnsRequestEventDetailsLine', () => {
  const mount = useMountAppended();

  const allProps = {
    contextId: 'test',
    hostName: '[hostName]',
    id: '1',
    processName: '[processName]',
    processPid: 123,
    registryKey: '[registryKey]',
    registryPath: '[registryPath]',
    text: MODIFIED_REGISTRY_KEY,
    userDomain: '[userDomain]',
    userName: '[userName]',
  };

  test('it renders the expected text when all properties are provided', () => {
    const wrapper = mount(
      <TestProviders>
        <RegistryEventDetailsLine {...allProps} />
      </TestProviders>
    );
    expect(wrapper.text()).toEqual(
      '[userName]\\[userDomain]@[hostName]modified registry key[registryKey]with new value[registryPath]via[processName](123)'
    );
  });

  test('it returns an empty string when when registryKey is null', () => {
    const wrapper = mount(
      <TestProviders>
        <RegistryEventDetailsLine {...allProps} registryKey={null} />
      </TestProviders>
    );
    expect(wrapper.text()).toEqual('');
  });

  test('it returns an empty string when registryKey is undefined', () => {
    const wrapper = mount(
      <TestProviders>
        <RegistryEventDetailsLine {...allProps} registryKey={undefined} />
      </TestProviders>
    );
    expect(wrapper.text()).toEqual('');
  });

  test('it renders the expected text when hostName is NOT provided', () => {
    const wrapper = mount(
      <TestProviders>
        <RegistryEventDetailsLine {...allProps} hostName={undefined} />
      </TestProviders>
    );
    expect(wrapper.text()).toEqual(
      '[userName]\\[userDomain]modified registry key[registryKey]with new value[registryPath]via[processName](123)'
    );
  });

  test('it renders the expected text when processName is NOT provided', () => {
    const wrapper = mount(
      <TestProviders>
        <RegistryEventDetailsLine {...allProps} processName={undefined} />
      </TestProviders>
    );
    expect(wrapper.text()).toEqual(
      '[userName]\\[userDomain]@[hostName]modified registry key[registryKey]with new value[registryPath]via(123)'
    );
  });

  test('it renders the expected text when processPid is NOT provided', () => {
    const wrapper = mount(
      <TestProviders>
        <RegistryEventDetailsLine {...allProps} processPid={undefined} />
      </TestProviders>
    );
    expect(wrapper.text()).toEqual(
      '[userName]\\[userDomain]@[hostName]modified registry key[registryKey]with new value[registryPath]via[processName]'
    );
  });

  test('it renders the expected text when registryPath is NOT provided', () => {
    const wrapper = mount(
      <TestProviders>
        <RegistryEventDetailsLine {...allProps} registryPath={undefined} />
      </TestProviders>
    );
    expect(wrapper.text()).toEqual(
      '[userName]\\[userDomain]@[hostName]modified registry key[registryKey]via[processName](123)'
    );
  });

  test('it renders the expected text when userDomain is NOT provided', () => {
    const wrapper = mount(
      <TestProviders>
        <RegistryEventDetailsLine {...allProps} userDomain={undefined} />
      </TestProviders>
    );
    expect(wrapper.text()).toEqual(
      '[userName]@[hostName]modified registry key[registryKey]with new value[registryPath]via[processName](123)'
    );
  });

  test('it renders the expected text when userName is NOT provided', () => {
    const wrapper = mount(
      <TestProviders>
        <RegistryEventDetailsLine {...allProps} userName={undefined} />
      </TestProviders>
    );
    expect(wrapper.text()).toEqual(
      '\\[userDomain][hostName]modified registry key[registryKey]with new value[registryPath]via[processName](123)'
    );
  });
});
