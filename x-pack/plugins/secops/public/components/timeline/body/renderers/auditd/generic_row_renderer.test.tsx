/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { mount, shallow } from 'enzyme';
import toJson from 'enzyme-to-json';
import { cloneDeep } from 'lodash/fp';
import * as React from 'react';

import { BrowserFields } from '../../../../../containers/source';
import { mockBrowserFields } from '../../../../../containers/source/mock';
import { Ecs } from '../../../../../graphql/types';
import { mockEcsData, TestProviders } from '../../../../../mock';
import { RowRenderer } from '../row_renderer';

import {
  createGenericAuditRowRenderer,
  createGenericFileRowRenderer,
} from './generic_row_renderer';

describe('GenericRowRenderer', () => {
  describe('#createGenericAuditRowRenderer', () => {
    let nonAuditd: Ecs;
    let auditd: Ecs;
    let connectedToRenderer: RowRenderer;
    beforeEach(() => {
      nonAuditd = cloneDeep(mockEcsData[0]);
      auditd = cloneDeep(mockEcsData[26]);
      connectedToRenderer = createGenericAuditRowRenderer({
        actionName: 'connected-to',
        text: 'some text',
      });
    });
    test('renders correctly against snapshot', () => {
      // I cannot and do not want to use BrowserFields mocks for the snapshot tests as they are too heavy
      const browserFields: BrowserFields = {};
      const children = connectedToRenderer.renderRow({
        browserFields,
        data: auditd,
        width: 100,
        children: <span>some children</span>,
      });

      const wrapper = shallow(<span>{children}</span>);
      expect(toJson(wrapper)).toMatchSnapshot();
    });

    test('should return false if not a auditd datum', () => {
      expect(connectedToRenderer.isInstance(nonAuditd)).toBe(false);
    });

    test('should return true if it is a auditd datum', () => {
      expect(connectedToRenderer.isInstance(auditd)).toBe(true);
    });

    test('should return false when action is set to some other value', () => {
      auditd.event != null
        ? (auditd.event.action = 'some other value')
        : expect(auditd.event).toBeDefined();
      expect(connectedToRenderer.isInstance(auditd)).toBe(false);
    });

    test('should render children normally if it does not have a auditd object', () => {
      const children = connectedToRenderer.renderRow({
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
      const children = connectedToRenderer.renderRow({
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
        'some children Session246alice@zeek-londonsome text/usr/bin/wgetwith resultsuccessDestination93.184.216.34:80'
      );
    });
  });

  describe('#createGenericFileRowRenderer', () => {
    let nonAuditd: Ecs;
    let auditdFile: Ecs;
    let fileToRenderer: RowRenderer;

    beforeEach(() => {
      nonAuditd = cloneDeep(mockEcsData[0]);
      auditdFile = cloneDeep(mockEcsData[27]);
      fileToRenderer = createGenericFileRowRenderer({
        actionName: 'opened-file',
        text: 'some text',
      });
    });

    test('renders correctly against snapshot', () => {
      // I cannot and do not want to use BrowserFields mocks for the snapshot tests as they are too heavy
      const browserFields: BrowserFields = {};
      const children = fileToRenderer.renderRow({
        browserFields,
        data: auditdFile,
        width: 100,
        children: <span>some children</span>,
      });

      const wrapper = shallow(<span>{children}</span>);
      expect(toJson(wrapper)).toMatchSnapshot();
    });

    test('should return false if not a auditd datum', () => {
      expect(fileToRenderer.isInstance(nonAuditd)).toBe(false);
    });

    test('should return true if it is a auditd datum', () => {
      expect(fileToRenderer.isInstance(auditdFile)).toBe(true);
    });

    test('should return false when action is set to some other value', () => {
      auditdFile.event != null
        ? (auditdFile.event.action = 'some other value')
        : expect(auditdFile.event).toBeDefined();
      expect(fileToRenderer.isInstance(auditdFile)).toBe(false);
    });

    test('should render children normally if it does not have a auditd object', () => {
      const children = fileToRenderer.renderRow({
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
      const children = fileToRenderer.renderRow({
        browserFields: mockBrowserFields,
        data: auditdFile,
        width: 100,
        children: <span>some children </span>,
      });
      const wrapper = mount(
        <TestProviders>
          <span>{children}</span>
        </TestProviders>
      );
      expect(wrapper.text()).toContain(
        'some children Sessionunsetroot@zeek-londonin/some text/proc/15990/attr/currentusing/lib/systemd/systemd-journaldwith resultsuccess'
      );
    });
  });
});
