/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { OVERVIEW_ROUTE } from '../../../common/constants';
import { uptimeOverviewNavigatorParams } from './overview';

describe('uptimeOverviewNavigatorParams', () => {
  it('supplies the correct app name', async () => {
    const location = await uptimeOverviewNavigatorParams.getLocation({});
    expect(location.app).toEqual('uptime');
  });

  it('creates the expected path when no params specified', async () => {
    const location = await uptimeOverviewNavigatorParams.getLocation({});
    expect(location.path).toEqual(OVERVIEW_ROUTE);
  });

  it('creates a path with expected search when ip is specified', async () => {
    const location = await uptimeOverviewNavigatorParams.getLocation({ ip: '127.0.0.1' });
    expect(location.path).toEqual(`${OVERVIEW_ROUTE}?search=monitor.ip: "127.0.0.1"`);
  });

  it('creates a path with expected search when hostname is specified', async () => {
    const location = await uptimeOverviewNavigatorParams.getLocation({ hostname: 'elastic.co' });
    expect(location.path).toEqual(`${OVERVIEW_ROUTE}?search=url.domain: "elastic.co"`);
  });

  it('creates a path with expected search when multiple keys are specified', async () => {
    const location = await uptimeOverviewNavigatorParams.getLocation({
      hostname: 'elastic.co',
      ip: '127.0.0.1',
    });
    expect(location.path).toEqual(
      `${OVERVIEW_ROUTE}?search=monitor.ip: "127.0.0.1" OR url.domain: "elastic.co"`
    );
  });
});
