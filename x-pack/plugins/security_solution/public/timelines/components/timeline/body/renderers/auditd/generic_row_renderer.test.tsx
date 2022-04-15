/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { shallow } from 'enzyme';
import { cloneDeep } from 'lodash/fp';
import React from 'react';

import { RowRenderer } from '../../../../../../../common/types';
import { Ecs } from '../../../../../../../common/ecs';
import { mockTimelineData, TestProviders } from '../../../../../../common/mock';
import { useMountAppended } from '../../../../../../common/utils/use_mount_appended';
import {
  createGenericAuditRowRenderer,
  createGenericFileRowRenderer,
} from './generic_row_renderer';

jest.mock('../../../../../../common/lib/kibana');

jest.mock('@elastic/eui', () => {
  const original = jest.requireActual('@elastic/eui');
  return {
    ...original,
    EuiScreenReaderOnly: () => <></>,
  };
});

jest.mock('../../../../../../common/components/link_to');
jest.mock('../../../../../../overview/components/events_by_dataset');

describe('GenericRowRenderer', () => {
  const mount = useMountAppended();

  describe('#createGenericAuditRowRenderer', () => {
    let nonAuditd: Ecs;
    let auditd: Ecs;
    let connectedToRenderer: RowRenderer;
    beforeEach(() => {
      nonAuditd = cloneDeep(mockTimelineData[0].ecs);
      auditd = cloneDeep(mockTimelineData[26].ecs);
      connectedToRenderer = createGenericAuditRowRenderer({
        actionName: 'connected-to',
        text: 'connected using',
      });
    });
    test('renders correctly against snapshot', () => {
      const children = connectedToRenderer.renderRow({
        data: auditd,
        isDraggable: true,
        timelineId: 'test',
      });

      const wrapper = shallow(<span>{children}</span>);
      expect(wrapper).toMatchSnapshot();
    });

    test('should return false if not a auditd datum', () => {
      expect(connectedToRenderer.isInstance(nonAuditd)).toBe(false);
    });

    test('should return true if it is a auditd datum', () => {
      expect(connectedToRenderer.isInstance(auditd)).toBe(true);
    });

    test('should return false when action is set to some other value', () => {
      if (auditd.event != null && auditd.event.action != null) {
        auditd.event.action[0] = 'some other value';
        expect(connectedToRenderer.isInstance(auditd)).toBe(false);
      } else {
        // will fail and give you an error if either is not defined as a mock
        expect(auditd.event).toBeDefined();
      }
    });

    test('should render a auditd row', () => {
      const children = connectedToRenderer.renderRow({
        data: auditd,
        isDraggable: true,
        timelineId: 'test',
      });
      const wrapper = mount(
        <TestProviders>
          <span>{children}</span>
        </TestProviders>
      );
      expect(wrapper.text()).toContain(
        'Session246alice@zeek-londonconnected usingwget(1490)wget www.example.comwith resultsuccessDestination192.168.216.34:80'
      );
    });
  });

  describe('#createGenericFileRowRenderer', () => {
    let nonAuditd: Ecs;
    let auditdFile: Ecs;
    let fileToRenderer: RowRenderer;

    beforeEach(() => {
      nonAuditd = cloneDeep(mockTimelineData[0].ecs);
      auditdFile = cloneDeep(mockTimelineData[27].ecs);
      fileToRenderer = createGenericFileRowRenderer({
        actionName: 'opened-file',
        text: 'opened file using',
      });
    });

    test('renders correctly against snapshot', () => {
      const children = fileToRenderer.renderRow({
        data: auditdFile,
        isDraggable: true,
        timelineId: 'test',
      });

      const wrapper = shallow(<span>{children}</span>);
      expect(wrapper).toMatchSnapshot();
    });

    test('should return false if not a auditd datum', () => {
      expect(fileToRenderer.isInstance(nonAuditd)).toBe(false);
    });

    test('should return true if it is a auditd datum', () => {
      expect(fileToRenderer.isInstance(auditdFile)).toBe(true);
    });

    test('should return false when action is set to some other value', () => {
      if (auditdFile.event != null && auditdFile.event.action != null) {
        auditdFile.event.action[0] = 'some other value';
        expect(fileToRenderer.isInstance(auditdFile)).toBe(false);
      } else {
        // will fail and give you an error if either is not defined as a mock
        expect(auditdFile.event).toBeDefined();
      }
    });

    test('should render a auditd row', () => {
      const children = fileToRenderer.renderRow({
        data: auditdFile,
        isDraggable: true,
        timelineId: 'test',
      });
      const wrapper = mount(
        <TestProviders>
          <span>{children}</span>
        </TestProviders>
      );
      expect(wrapper.text()).toContain(
        'Session242root@zeek-londonin/opened file using/proc/15990/attr/currentusingsystemd-journal(27244)/lib/systemd/systemd-journaldwith resultsuccess'
      );
    });
  });
});
