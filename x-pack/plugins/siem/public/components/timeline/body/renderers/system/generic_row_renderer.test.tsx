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
import { mockTimelineData, TestProviders } from '../../../../../mock';
import { RowRenderer } from '../row_renderer';
import {
  createGenericSystemRowRenderer,
  createGenericFileRowRenderer,
} from './generic_row_renderer';

describe('GenericRowRenderer', () => {
  describe('#createGenericSystemRowRenderer', () => {
    let nonSystem: Ecs;
    let system: Ecs;
    let connectedToRenderer: RowRenderer;
    beforeEach(() => {
      nonSystem = cloneDeep(mockTimelineData[0].ecs);
      system = cloneDeep(mockTimelineData[29].ecs);
      connectedToRenderer = createGenericSystemRowRenderer({
        actionName: 'process_started',
        text: 'some text',
      });
    });
    test('renders correctly against snapshot', () => {
      // I cannot and do not want to use BrowserFields mocks for the snapshot tests as they are too heavy
      const browserFields: BrowserFields = {};
      const children = connectedToRenderer.renderRow({
        browserFields,
        data: system,
        width: 100,
        children: <span>{'some children'}</span>,
      });

      const wrapper = shallow(<span>{children}</span>);
      expect(toJson(wrapper)).toMatchSnapshot();
    });

    test('should return false if not a system datum', () => {
      expect(connectedToRenderer.isInstance(nonSystem)).toBe(false);
    });

    test('should return true if it is a system datum', () => {
      expect(connectedToRenderer.isInstance(system)).toBe(true);
    });

    test('should return false when action is set to some other value', () => {
      if (system.event != null && system.event.action != null) {
        system.event.action[0] = 'some other value';
        expect(connectedToRenderer.isInstance(system)).toBe(false);
      } else {
        // if system.event or system.event.action is not defined in the mock
        // then we will get an error here
        expect(system.event).toBeDefined();
      }
    });
    test('should render a system row', () => {
      const children = connectedToRenderer.renderRow({
        browserFields: mockBrowserFields,
        data: system,
        width: 100,
        children: <span>{'some children '}</span>,
      });
      const wrapper = mount(
        <TestProviders>
          <span>{children}</span>
        </TestProviders>
      );
      expect(wrapper.text()).toContain(
        'some children Evan@zeek-londonsome text6278with resultfailureSource128.199.212.120'
      );
    });
  });

  describe('#createGenericFileRowRenderer', () => {
    let nonSystem: Ecs;
    let systemFile: Ecs;
    let fileToRenderer: RowRenderer;

    beforeEach(() => {
      nonSystem = cloneDeep(mockTimelineData[0].ecs);
      systemFile = cloneDeep(mockTimelineData[28].ecs);
      fileToRenderer = createGenericFileRowRenderer({
        actionName: 'user_login',
        text: 'some text',
      });
    });

    test('renders correctly against snapshot', () => {
      // I cannot and do not want to use BrowserFields mocks for the snapshot tests as they are too heavy
      const browserFields: BrowserFields = {};
      const children = fileToRenderer.renderRow({
        browserFields,
        data: systemFile,
        width: 100,
        children: <span>{'some children'}</span>,
      });

      const wrapper = shallow(<span>{children}</span>);
      expect(toJson(wrapper)).toMatchSnapshot();
    });

    test('should return false if not a auditd datum', () => {
      expect(fileToRenderer.isInstance(nonSystem)).toBe(false);
    });

    test('should return true if it is a auditd datum', () => {
      expect(fileToRenderer.isInstance(systemFile)).toBe(true);
    });

    test('should return false when action is set to some other value', () => {
      if (systemFile.event != null && systemFile.event.action != null) {
        systemFile.event.action[0] = 'some other value';
        expect(fileToRenderer.isInstance(systemFile)).toBe(false);
      } else {
        expect(systemFile.event).toBeDefined();
      }
    });

    test('should render a system row', () => {
      const children = fileToRenderer.renderRow({
        browserFields: mockBrowserFields,
        data: systemFile,
        width: 100,
        children: <span>{'some children '}</span>,
      });
      const wrapper = mount(
        <TestProviders>
          <span>{children}</span>
        </TestProviders>
      );
      expect(wrapper.text()).toContain(
        'some children Braden@zeek-londonsome text6278with resultfailureSource128.199.212.120'
      );
    });
  });
});
