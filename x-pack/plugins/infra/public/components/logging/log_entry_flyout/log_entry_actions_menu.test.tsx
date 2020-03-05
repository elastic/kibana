/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import testSubject from '@kbn/test-subj-selector';
import React from 'react';
import { act } from 'react-dom/test-utils';

import { mount } from 'enzyme';
import { LogEntryActionsMenu } from './log_entry_actions_menu';

describe('LogEntryActionsMenu component', () => {
  describe('uptime link', () => {
    it('renders with a host ip filter when present in log entry', () => {
      const elementWrapper = mount(
        <LogEntryActionsMenu
          logItem={{
            fields: [{ field: 'host.ip', value: 'HOST_IP' }],
            id: 'ITEM_ID',
            index: 'INDEX',
            key: {
              time: 0,
              tiebreaker: 0,
            },
          }}
        />
      );

      act(() => {
        elementWrapper
          .find(`button${testSubject('logEntryActionsMenuButton')}`)
          .last()
          .simulate('click');
      });
      elementWrapper.update();

      expect(
        elementWrapper.find(`a${testSubject('~uptimeLogEntryActionsMenuItem')}`).prop('href')
      ).toMatchInlineSnapshot(`"/app/uptime#/?search=(host.ip:HOST_IP)"`);
    });

    it('renders with a container id filter when present in log entry', () => {
      const elementWrapper = mount(
        <LogEntryActionsMenu
          logItem={{
            fields: [{ field: 'container.id', value: 'CONTAINER_ID' }],
            id: 'ITEM_ID',
            index: 'INDEX',
            key: {
              time: 0,
              tiebreaker: 0,
            },
          }}
        />
      );

      act(() => {
        elementWrapper
          .find(`button${testSubject('logEntryActionsMenuButton')}`)
          .last()
          .simulate('click');
      });
      elementWrapper.update();

      expect(
        elementWrapper.find(`a${testSubject('~uptimeLogEntryActionsMenuItem')}`).prop('href')
      ).toMatchInlineSnapshot(`"/app/uptime#/?search=(container.id:CONTAINER_ID)"`);
    });

    it('renders with a pod uid filter when present in log entry', () => {
      const elementWrapper = mount(
        <LogEntryActionsMenu
          logItem={{
            fields: [{ field: 'kubernetes.pod.uid', value: 'POD_UID' }],
            id: 'ITEM_ID',
            index: 'INDEX',
            key: {
              time: 0,
              tiebreaker: 0,
            },
          }}
        />
      );

      act(() => {
        elementWrapper
          .find(`button${testSubject('logEntryActionsMenuButton')}`)
          .last()
          .simulate('click');
      });
      elementWrapper.update();

      expect(
        elementWrapper.find(`a${testSubject('~uptimeLogEntryActionsMenuItem')}`).prop('href')
      ).toMatchInlineSnapshot(`"/app/uptime#/?search=(kubernetes.pod.uid:POD_UID)"`);
    });

    it('renders with a disjunction of filters when multiple present in log entry', () => {
      const elementWrapper = mount(
        <LogEntryActionsMenu
          logItem={{
            fields: [
              { field: 'container.id', value: 'CONTAINER_ID' },
              { field: 'host.ip', value: 'HOST_IP' },
              { field: 'kubernetes.pod.uid', value: 'POD_UID' },
            ],
            id: 'ITEM_ID',
            index: 'INDEX',
            key: {
              time: 0,
              tiebreaker: 0,
            },
          }}
        />
      );

      act(() => {
        elementWrapper
          .find(`button${testSubject('logEntryActionsMenuButton')}`)
          .last()
          .simulate('click');
      });
      elementWrapper.update();

      expect(
        elementWrapper.find(`a${testSubject('~uptimeLogEntryActionsMenuItem')}`).prop('href')
      ).toMatchInlineSnapshot(
        `"/app/uptime#/?search=(container.id:CONTAINER_ID OR host.ip:HOST_IP OR kubernetes.pod.uid:POD_UID)"`
      );
    });

    it('renders as disabled when no supported field is present in log entry', () => {
      const elementWrapper = mount(
        <LogEntryActionsMenu
          logItem={{
            fields: [],
            id: 'ITEM_ID',
            index: 'INDEX',
            key: {
              time: 0,
              tiebreaker: 0,
            },
          }}
        />
      );

      act(() => {
        elementWrapper
          .find(`button${testSubject('logEntryActionsMenuButton')}`)
          .last()
          .simulate('click');
      });
      elementWrapper.update();

      expect(
        elementWrapper
          .find(`button${testSubject('~uptimeLogEntryActionsMenuItem')}`)
          .prop('disabled')
      ).toEqual(true);
    });
  });

  describe('apm link', () => {
    it('renders with a trace id filter when present in log entry', () => {
      const elementWrapper = mount(
        <LogEntryActionsMenu
          logItem={{
            fields: [{ field: 'trace.id', value: '1234567' }],
            id: 'ITEM_ID',
            index: 'INDEX',
            key: {
              time: 0,
              tiebreaker: 0,
            },
          }}
        />
      );

      act(() => {
        elementWrapper
          .find(`button${testSubject('logEntryActionsMenuButton')}`)
          .last()
          .simulate('click');
      });
      elementWrapper.update();

      expect(
        elementWrapper.find(`a${testSubject('~apmLogEntryActionsMenuItem')}`).prop('href')
      ).toBeDefined();
    });

    it('renders with a trace id filter and timestamp when present in log entry', () => {
      const timestamp = '2019-06-27T17:44:08.693Z';
      const elementWrapper = mount(
        <LogEntryActionsMenu
          logItem={{
            fields: [
              { field: 'trace.id', value: '1234567' },
              { field: '@timestamp', value: timestamp },
            ],
            id: 'ITEM_ID',
            index: 'INDEX',
            key: {
              time: 0,
              tiebreaker: 0,
            },
          }}
        />
      );

      act(() => {
        elementWrapper
          .find(`button${testSubject('logEntryActionsMenuButton')}`)
          .last()
          .simulate('click');
      });
      elementWrapper.update();

      expect(
        elementWrapper.find(`a${testSubject('~apmLogEntryActionsMenuItem')}`).prop('href')
      ).toBeDefined();
    });

    it('renders as disabled when no supported field is present in log entry', () => {
      const elementWrapper = mount(
        <LogEntryActionsMenu
          logItem={{
            fields: [],
            id: 'ITEM_ID',
            index: 'INDEX',
            key: {
              time: 0,
              tiebreaker: 0,
            },
          }}
        />
      );

      act(() => {
        elementWrapper
          .find(`button${testSubject('logEntryActionsMenuButton')}`)
          .last()
          .simulate('click');
      });
      elementWrapper.update();

      expect(
        elementWrapper.find(`button${testSubject('~apmLogEntryActionsMenuItem')}`).prop('disabled')
      ).toEqual(true);
    });
  });
});
