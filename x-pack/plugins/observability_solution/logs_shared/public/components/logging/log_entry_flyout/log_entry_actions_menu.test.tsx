/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { coreMock } from '@kbn/core/public/mocks';
import {
  uptimeOverviewLocatorID,
  UptimeOverviewLocatorInfraParams,
  UptimeOverviewLocatorParams,
} from '@kbn/deeplinks-observability';
import { KibanaContextProvider } from '@kbn/kibana-react-plugin/public';
import { MockUrlService } from '@kbn/share-plugin/common/mocks';
import { type UrlService } from '@kbn/share-plugin/common/url_service';
import { mountWithIntl as mount } from '@kbn/test-jest-helpers';
import { subj as testSubject } from '@kbn/test-subj-selector';
import React, { FC } from 'react';
import { act } from 'react-dom/test-utils';
import { LogEntryActionsMenu } from './log_entry_actions_menu';

const coreStartMock = coreMock.createStart();
coreStartMock.application.getUrlForApp.mockImplementation((app, options) => {
  return `/test-basepath/s/test-space/app/${app}${options?.path}`;
});

const emptyUrlService = new MockUrlService();
const urlServiceWithUptimeLocator = new MockUrlService();
// we can't use the actual locator here because its import would create a
// forbidden ts project reference cycle
urlServiceWithUptimeLocator.locators.create<
  UptimeOverviewLocatorInfraParams | UptimeOverviewLocatorParams
>({
  id: uptimeOverviewLocatorID,
  getLocation: async (params) => {
    return { app: 'uptime', path: '/overview', state: {} };
  },
});

const ProviderWrapper: FC<{ urlService?: UrlService }> = ({
  children,
  urlService = emptyUrlService,
}) => {
  return (
    <KibanaContextProvider services={{ ...coreStartMock, share: { url: urlService } }}>
      {children}
    </KibanaContextProvider>
  );
};

describe('LogEntryActionsMenu component', () => {
  const time = new Date().toISOString();

  describe('uptime link with legacy uptime disabled', () => {
    it('renders as disabled even when a supported field is present', () => {
      const elementWrapper = mount(
        <ProviderWrapper>
          <LogEntryActionsMenu
            logEntry={{
              fields: [{ field: 'host.ip', value: ['HOST_IP'] }],
              id: 'ITEM_ID',
              index: 'INDEX',
              cursor: {
                time,
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
          .find(`${testSubject('~uptimeLogEntryActionsMenuItem')}`)
          .first()
          .prop('disabled')
      ).toEqual(true);
    });
  });

  describe('uptime link with legacy uptime enabled', () => {
    it('renders as enabled when a host ip is present in the log entry', () => {
      const elementWrapper = mount(
        <ProviderWrapper urlService={urlServiceWithUptimeLocator}>
          <LogEntryActionsMenu
            logEntry={{
              fields: [{ field: 'host.ip', value: ['HOST_IP'] }],
              id: 'ITEM_ID',
              index: 'INDEX',
              cursor: {
                time,
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
      ).toEqual(expect.any(String));
    });

    it('renders as enabled when a container id is present in the log entry', () => {
      const elementWrapper = mount(
        <ProviderWrapper urlService={urlServiceWithUptimeLocator}>
          <LogEntryActionsMenu
            logEntry={{
              fields: [{ field: 'container.id', value: ['CONTAINER_ID'] }],
              id: 'ITEM_ID',
              index: 'INDEX',
              cursor: {
                time,
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
      ).toEqual(expect.any(String));
    });

    it('renders as enabled when a pod uid is present in the log entry', () => {
      const elementWrapper = mount(
        <ProviderWrapper urlService={urlServiceWithUptimeLocator}>
          <LogEntryActionsMenu
            logEntry={{
              fields: [{ field: 'kubernetes.pod.uid', value: ['POD_UID'] }],
              id: 'ITEM_ID',
              index: 'INDEX',
              cursor: {
                time,
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
      ).toEqual(expect.any(String));
    });

    it('renders as disabled when no supported field is present in the log entry', () => {
      const elementWrapper = mount(
        <ProviderWrapper urlService={urlServiceWithUptimeLocator}>
          <LogEntryActionsMenu
            logEntry={{
              fields: [],
              id: 'ITEM_ID',
              index: 'INDEX',
              cursor: {
                time,
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
          .find(`${testSubject('~uptimeLogEntryActionsMenuItem')}`)
          .first()
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
                time,
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
                time,
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
                time,
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
