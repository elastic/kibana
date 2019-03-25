/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { mount, shallow } from 'enzyme';
import toJson from 'enzyme-to-json';
import { cloneDeep } from 'lodash/fp';
import * as React from 'react';

import { BrowserFields } from '../../../../containers/source';
import { mockBrowserFields } from '../../../../containers/source/mock';
import { Ecs } from '../../../../graphql/types';
import { mockEcsData, TestProviders } from '../../../../mock';

import { auditdLoggedinRowRenderer } from '.';

describe('auditd_loggedin_row_renderer', () => {
  let nonAuditdExecuted: Ecs;
  let auditdExecuted: Ecs;

  beforeEach(() => {
    nonAuditdExecuted = cloneDeep(mockEcsData[0]);
    auditdExecuted = cloneDeep(mockEcsData[20]);
  });

  test('renders correctly against snapshot', () => {
    // I cannot and do not want to use the BrowserFields mocks for the snapshot tests as they are too heavy
    const browserFields: BrowserFields = {};
    const children = auditdLoggedinRowRenderer.renderRow({
      browserFields,
      data: auditdExecuted,
      width: 100,
      children: <span>some children</span>,
    });

    const wrapper = shallow(<span>{children}</span>);
    expect(toJson(wrapper)).toMatchSnapshot();
  });

  test('should return false if not a auditd executed datum', () => {
    expect(auditdLoggedinRowRenderer.isInstance(nonAuditdExecuted)).toBe(false);
  });

  test('should return true if it is a auditd executed datum', () => {
    expect(auditdLoggedinRowRenderer.isInstance(auditdExecuted)).toBe(true);
  });

  test('should return false when action is set to some other value', () => {
    auditdExecuted.event!.action = 'some other value';
    expect(auditdLoggedinRowRenderer.isInstance(auditdExecuted)).toBe(false);
  });

  test('should render children normally if it does not have a auditd object', () => {
    const children = auditdLoggedinRowRenderer.renderRow({
      browserFields: mockBrowserFields,
      data: nonAuditdExecuted,
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

  test('should render a auditd executed row', () => {
    const children = auditdLoggedinRowRenderer.renderRow({
      browserFields: mockBrowserFields,
      data: auditdExecuted,
      width: 100,
      children: <span>some children </span>,
    });
    const wrapper = mount(
      <TestProviders>
        <span>{children}</span>
      </TestProviders>
    );
    expect(wrapper.text()).toContain(
      'some children Session14alice@zeek-londonattempted a login via/usr/sbin/sshdwith resultsuccessSource8.42.77.171'
    );
  });
});
