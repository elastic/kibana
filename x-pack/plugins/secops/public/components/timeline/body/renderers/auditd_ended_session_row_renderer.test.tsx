/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { mount, shallow } from 'enzyme';
import toJson from 'enzyme-to-json';
import { cloneDeep } from 'lodash/fp';
import * as React from 'react';
import { BrowserFields } from 'x-pack/plugins/secops/public/containers/source';

import { mockBrowserFields } from '../../../../containers/source/mock';
import { Ecs } from '../../../../graphql/types';
import { mockEcsData, TestProviders } from '../../../../mock';

import { auditdEndedSessionRowRenderer } from '.';

describe('auditdEndedSessionRowRenderer', () => {
  let nonAuditd: Ecs;
  let auditd: Ecs;

  beforeEach(() => {
    nonAuditd = cloneDeep(mockEcsData[0]);
    auditd = cloneDeep(mockEcsData[21]);
  });

  test('renders correctly against snapshot', () => {
    // I cannot and do not want to use the mocks for the snapshot tests as they are too heavy
    const browserFields: BrowserFields = {};
    const children = auditdEndedSessionRowRenderer.renderRow({
      browserFields,
      data: auditd,
      width: 100,
      children: <span>some children</span>,
    });

    const wrapper = shallow(<span>{children}</span>);
    expect(toJson(wrapper)).toMatchSnapshot();
  });

  test('should return false if not a auditd datum', () => {
    expect(auditdEndedSessionRowRenderer.isInstance(nonAuditd)).toBe(false);
  });

  test('should return true if it is a auditd datum', () => {
    expect(auditdEndedSessionRowRenderer.isInstance(auditd)).toBe(true);
  });

  test('should return false when action is set to some other value', () => {
    auditd.event != null
      ? (auditd.event.action = 'some other value')
      : expect(auditd.event).toBeDefined();
    expect(auditdEndedSessionRowRenderer.isInstance(auditd)).toBe(false);
  });

  test('should render children normally if it does not have a auditd object', () => {
    const children = auditdEndedSessionRowRenderer.renderRow({
      browserFields: mockBrowserFields,
      data: nonAuditd,
      width: 100,
      children: <span>some children</span>,
    });
    const wrapper = mount(
      <TestProviders>
        <span>{children}</span>
      </TestProviders>
    );
    expect(wrapper.text()).toEqual('some children');
  });

  test('should render a auditd row', () => {
    const children = auditdEndedSessionRowRenderer.renderRow({
      browserFields: mockBrowserFields,
      data: auditd,
      width: 100,
      children: <span>some children </span>,
    });
    const wrapper = mount(
      <TestProviders>
        <span>{children}</span>
      </TestProviders>
    );
    expect(wrapper.text()).toContain(
      'some children Session340alice@suricata-bangaloreended from/usr/sbin/sshd'
    );
  });
});
