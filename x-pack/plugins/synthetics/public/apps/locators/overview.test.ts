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
    const location = await uptimeOverviewNavigatorParams.getLocation({ host: 'elastic.co' });
    expect(location.path).toEqual(`${OVERVIEW_ROUTE}?search=host.name: "elastic.co"`);
  });

  it('creates a path with expected search when multiple host keys are specified', async () => {
    const location = await uptimeOverviewNavigatorParams.getLocation({
      host: 'elastic.co',
      ip: '127.0.0.1',
    });
    expect(location.path).toEqual(
      `${OVERVIEW_ROUTE}?search=host.name: "elastic.co" OR host.ip: "127.0.0.1"`
    );
  });

  it('creates a path with expected search when multiple kubernetes pod is specified', async () => {
    const location = await uptimeOverviewNavigatorParams.getLocation({
      pod: 'foo',
      ip: '10.0.0.1',
    });
    expect(location.path).toEqual(
      `${OVERVIEW_ROUTE}?search=kubernetes.pod.uid: "foo" OR monitor.ip: "10.0.0.1"`
    );
  });

  it('creates a path with expected search when docker container is specified', async () => {
    const location = await uptimeOverviewNavigatorParams.getLocation({
      container: 'foo',
    });
    expect(location.path).toEqual(`${OVERVIEW_ROUTE}?search=container.id: "foo"`);
  });
});
