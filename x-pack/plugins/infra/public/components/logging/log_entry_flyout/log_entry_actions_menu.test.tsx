/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import testSubject from '@kbn/test-subj-selector';
import React from 'react';
import { act } from 'react-dom/test-utils';

import { mount } from 'enzyme';
import { LogEntryActionsMenu } from './log_entry_actions_menu';
import { KibanaContextProvider } from '@kbn/kibana-react-plugin/public';
import { coreMock } from '@kbn/core/public/mocks';

const coreStartMock = coreMock.createStart();
coreStartMock.application.getUrlForApp.mockImplementation((app, options) => {
  return `/test-basepath/s/test-space/app/${app}${options?.path}`;
});

const ProviderWrapper: React.FC = ({ children }) => {
  return <KibanaContextProvider services={{ ...coreStartMock }}>{children}</KibanaContextProvider>;
};

describe('LogEntryActionsMenu component', () => {
  describe('uptime link', () => {
    it('renders with a host ip filter when present in log entry', () => {
      const elementWrapper = mount(
        <ProviderWrapper>
          <LogEntryActionsMenu
            logEntry={{
              fields: [{ field: 'host.ip', value: ['HOST_IP'] }],
              id: 'ITEM_ID',
              index: 'INDEX',
              cursor: {
                time: 0,
                tiebreaker: 0,
              },
            }}
          />
        </ProviderWrapper>
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
      ).toBe('/test-basepath/s/test-space/app/uptime#/?search=host.ip:HOST_IP');
    });

    it('renders with a container id filter when present in log entry', () => {
      const elementWrapper = mount(
        <ProviderWrapper>
          <LogEntryActionsMenu
            logEntry={{
              fields: [{ field: 'container.id', value: ['CONTAINER_ID'] }],
              id: 'ITEM_ID',
              index: 'INDEX',
              cursor: {
                time: 0,
                tiebreaker: 0,
              },
            }}
          />
        </ProviderWrapper>
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
      ).toBe('/test-basepath/s/test-space/app/uptime#/?search=container.id:CONTAINER_ID');
    });

    it('renders with a pod uid filter when present in log entry', () => {
      const elementWrapper = mount(
        <ProviderWrapper>
          <LogEntryActionsMenu
            logEntry={{
              fields: [{ field: 'kubernetes.pod.uid', value: ['POD_UID'] }],
              id: 'ITEM_ID',
              index: 'INDEX',
              cursor: {
                time: 0,
                tiebreaker: 0,
              },
            }}
          />
        </ProviderWrapper>
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
      ).toBe('/test-basepath/s/test-space/app/uptime#/?search=kubernetes.pod.uid:POD_UID');
    });

    it('renders with a disjunction of filters when multiple present in log entry', () => {
      const elementWrapper = mount(
        <ProviderWrapper>
          <LogEntryActionsMenu
            logEntry={{
              fields: [
                { field: 'container.id', value: ['CONTAINER_ID'] },
                { field: 'host.ip', value: ['HOST_IP'] },
                { field: 'kubernetes.pod.uid', value: ['POD_UID'] },
              ],
              id: 'ITEM_ID',
              index: 'INDEX',
              cursor: {
                time: 0,
                tiebreaker: 0,
              },
            }}
          />
        </ProviderWrapper>
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
      ).toBe(
        '/test-basepath/s/test-space/app/uptime#/?search=container.id:CONTAINER_ID%20or%20host.ip:HOST_IP%20or%20kubernetes.pod.uid:POD_UID'
      );
    });

    it('renders as disabled when no supported field is present in log entry', () => {
      const elementWrapper = mount(
        <ProviderWrapper>
          <LogEntryActionsMenu
            logEntry={{
              fields: [],
              id: 'ITEM_ID',
              index: 'INDEX',
              cursor: {
                time: 0,
                tiebreaker: 0,
              },
            }}
          />
        </ProviderWrapper>
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
        <ProviderWrapper>
          <LogEntryActionsMenu
            logEntry={{
              fields: [{ field: 'trace.id', value: ['1234567'] }],
              id: 'ITEM_ID',
              index: 'INDEX',
              cursor: {
                time: 0,
                tiebreaker: 0,
              },
            }}
          />
        </ProviderWrapper>
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
        <ProviderWrapper>
          <LogEntryActionsMenu
            logEntry={{
              fields: [
                { field: 'trace.id', value: ['1234567'] },
                { field: '@timestamp', value: [timestamp] },
              ],
              id: 'ITEM_ID',
              index: 'INDEX',
              cursor: {
                time: 0,
                tiebreaker: 0,
              },
            }}
          />
        </ProviderWrapper>
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
        <ProviderWrapper>
          <LogEntryActionsMenu
            logEntry={{
              fields: [],
              id: 'ITEM_ID',
              index: 'INDEX',
              cursor: {
                time: 0,
                tiebreaker: 0,
              },
            }}
          />
        </ProviderWrapper>
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
