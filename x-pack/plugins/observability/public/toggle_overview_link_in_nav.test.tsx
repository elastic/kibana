/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Subject } from 'rxjs';
import { AppUpdater, AppNavLinkStatus } from '../../../../src/core/public';
import { applicationServiceMock } from '../../../../src/core/public/mocks';

import { toggleOverviewLinkInNav } from './toggle_overview_link_in_nav';

describe('toggleOverviewLinkInNav', () => {
  let applicationStart: ReturnType<typeof applicationServiceMock.createStartContract>;
  let subjectMock: jest.Mocked<Subject<AppUpdater>>;

  beforeEach(() => {
    applicationStart = applicationServiceMock.createStartContract();
    subjectMock = {
      next: jest.fn(),
    } as any;
  });

  it('hides overview menu', () => {
    applicationStart.capabilities = {
      management: {},
      catalogue: {},
      navLinks: {
        apm: false,
        logs: false,
        metrics: false,
        uptime: false,
      },
    };

    toggleOverviewLinkInNav(subjectMock, applicationStart);

    expect(subjectMock.next).toHaveBeenCalledTimes(1);
    const updater = subjectMock.next.mock.calls[0][0]!;
    expect(updater({} as any)).toEqual({
      navLinkStatus: AppNavLinkStatus.hidden,
    });
  });
  it('shows overview menu', () => {
    applicationStart.capabilities = {
      management: {},
      catalogue: {},
      navLinks: {
        apm: true,
        logs: false,
        metrics: false,
        uptime: false,
      },
    };

    toggleOverviewLinkInNav(subjectMock, applicationStart);

    expect(subjectMock.next).not.toHaveBeenCalled();
  });
});
