/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { storiesOf } from '@storybook/react';
import type { HttpSetup, NotificationsStart } from 'kibana/public';
import moment from 'moment';
import * as React from 'react';
// eslint-disable-next-line @kbn/eslint/no-restricted-paths
import type { UrlGeneratorsStart } from 'src/plugins/share/public/url_generators';
import { SessionsMgmtConfigSchema } from '../..';
// eslint-disable-next-line @kbn/eslint/no-restricted-paths
import { SessionsClient } from '../../../../../../../../src/plugins/data/public/search';
import { ACTION, STATUS } from '../../../../../common/search/sessions_mgmt';
import { SearchSessionsMgmtAPI } from '../../lib/api';
import { SearchSessionsMgmtTable } from './table';

export default {
  title: 'BackgroundSessionsMgmt/Table',
  component: SearchSessionsMgmtTable,
};

storiesOf('components/BackgroundSessionsMgmt/Table', module)
  .add('no items', () => {
    const sessionsClient = new SessionsClient({ http: ({} as unknown) as HttpSetup });
    const urls = ({
      urlGenerator: {},
      getUrlGenerator: () => ({
        createUrl: () => ({}),
      }),
    } as unknown) as UrlGeneratorsStart;
    const notifications = ({
      toasts: {
        addInfo: () => ({}),
      },
    } as unknown) as NotificationsStart;
    const config: SessionsMgmtConfigSchema = {
      maxSessions: 100,
      refreshInterval: moment.duration(1, 'minutes'),
      refreshTimeout: moment.duration(20, 'minutes'),
      expiresSoonWarning: moment.duration(2, 'days'),
    };

    const props = {
      initialTable: [],
      api: new SearchSessionsMgmtAPI(sessionsClient, urls, notifications, config),
      timezone: 'UTC',
      config,
    };

    return <SearchSessionsMgmtTable {...props} />;
  })
  .add('completed session', () => {
    const sessionsClient = new SessionsClient({ http: ({} as unknown) as HttpSetup });
    const urls = ({
      urlGenerator: {},
      getUrlGenerator: () => ({
        createUrl: () => ({}),
      }),
    } as unknown) as UrlGeneratorsStart;
    const notifications = ({
      toasts: {
        addInfo: () => ({}),
      },
    } as unknown) as NotificationsStart;
    const config: SessionsMgmtConfigSchema = {
      maxSessions: 100,
      refreshInterval: moment.duration(1, 'minutes'),
      refreshTimeout: moment.duration(20, 'minutes'),
      expiresSoonWarning: moment.duration(2, 'days'),
    };

    const initialTable = [
      {
        id: 'foo-123',
        name: 'Single Session',
        appId: 'dashboards',
        created: '2020-12-29T00:00:00Z',
        expires: '2021-01-15T00:00:00Z',
        status: STATUS.COMPLETE,
        url: '/pepperoni',
        isViewable: true,
      },
    ];

    const props = {
      api: new SearchSessionsMgmtAPI(sessionsClient, urls, notifications, config),
      timezone: 'UTC',
      initialTable,
      config,
    };

    return <SearchSessionsMgmtTable {...props} />;
  })
  .add('completed session, expires soon', () => {
    const sessionsClient = new SessionsClient({ http: ({} as unknown) as HttpSetup });
    const urls = ({
      urlGenerator: {},
      getUrlGenerator: () => ({
        createUrl: () => ({}),
      }),
    } as unknown) as UrlGeneratorsStart;
    const notifications = ({
      toasts: {
        addInfo: () => ({}),
      },
    } as unknown) as NotificationsStart;
    const config: SessionsMgmtConfigSchema = {
      maxSessions: 100,
      refreshInterval: moment.duration(1, 'minutes'),
      refreshTimeout: moment.duration(20, 'minutes'),
      expiresSoonWarning: moment.duration(2, 'days'),
    };

    const created = moment().subtract(86000000);
    const expires = moment().add(86000000);
    const initialTable = [
      {
        id: 'foo-123',
        name: 'Single Session',
        appId: 'dashboards',
        created: created.format(),
        expires: expires.format(),
        status: STATUS.COMPLETE,
        url: '/pepperoni',
        isViewable: true,
      },
      {
        id: 'foo-123',
        name: 'Single Session',
        appId: 'dashboards',
        created: created.format(),
        expires: expires.add(86000000).format(),
        status: STATUS.COMPLETE,
        url: '/pepperoni',
        isViewable: true,
      },
    ];

    const props = {
      api: new SearchSessionsMgmtAPI(sessionsClient, urls, notifications, config),
      timezone: 'UTC',
      initialTable,
      config,
    };

    return <SearchSessionsMgmtTable {...props} />;
  })
  .add('pages of random data', () => {
    const sessionsClient = new SessionsClient({ http: ({} as unknown) as HttpSetup });
    const urls = ({
      urlGenerator: {},
      getUrlGenerator: () => ({
        createUrl: () => ({}),
      }),
    } as unknown) as UrlGeneratorsStart;
    const notifications = ({
      toasts: {
        addInfo: () => ({}),
      },
    } as unknown) as NotificationsStart;
    const config: SessionsMgmtConfigSchema = {
      maxSessions: 100,
      refreshInterval: moment.duration(1, 'minutes'),
      refreshTimeout: moment.duration(20, 'minutes'),
      expiresSoonWarning: moment.duration(2, 'days'),
    };

    const names = [
      'Session 1',
      'Session 2',
      'Session 3',
      'Session 3',
      'Session 4',
      'Session 5',
      'very very very very very very very very very very very very very very very very very very very very very very very long name',
      'Session 10',
      'Session 11',
      'Session 12',
      'Session 13',
      'Session 14',
      'Session 15',
      'Session 20',
      'Session 21',
      'Session 22',
      'Session 23',
      'Session 24',
      'Session 25',
      'Session 30',
      'Session 31',
      'Session 32',
      'Session 33',
      'Session 34',
      'Session 35',
    ];

    const appIds = ['canvas', 'discover', 'dashboards', 'visualize', 'security'];
    const statuses = [
      STATUS.CANCELLED,
      STATUS.COMPLETE,
      STATUS.ERROR,
      STATUS.EXPIRED,
      STATUS.IN_PROGRESS,
    ];
    const viewability = [true, true, false];
    const actions = [[ACTION.DELETE]];

    const mockTable = names.map((name, ndx) => {
      const created = moment().subtract(86000000 * ndx);
      const expires = moment().add(86000000 * ndx);

      return {
        name,
        id: `cool-session-${ndx}`,
        created: created.format(),
        expires: expires.format(),
        url: `/cool-app-${ndx}`,
        appId: appIds[ndx % 5],
        status: statuses[ndx % 5],
        isViewable: viewability[ndx % 3],
        actions: actions[ndx % 2],
      };
    });

    const props = {
      api: new SearchSessionsMgmtAPI(sessionsClient, urls, notifications, config),
      timezone: 'UTC',
      initialTable: mockTable,
      config,
    };

    return <SearchSessionsMgmtTable {...props} />;
  });
