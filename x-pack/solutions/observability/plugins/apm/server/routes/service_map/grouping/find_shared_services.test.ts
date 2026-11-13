/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { findSharedServices } from './find_shared_services';
import type { ServiceCallStats } from './types';

/** `count` services named `prefix-0`, `prefix-1`... with the same stats. */
function servicesLike(
  prefix: string,
  count: number,
  stats: Pick<ServiceCallStats, 'callers' | 'neighbours'>
): Array<[string, ServiceCallStats]> {
  return Array.from({ length: count }, (_, index) => [
    `${prefix}-${index}`,
    { ...stats, traffic: 1 },
  ]);
}

function stat(callers: number, neighbours: number): ServiceCallStats {
  return { callers, neighbours, traffic: 1 };
}

describe('findSharedServices', () => {
  it('shares a service called by a quarter of the map, even with an ordinary number of neighbours', () => {
    // neighbours vary widely (mean 25, standard deviation 15), so the outlier bar is far above 25
    const stats = new Map([
      ...servicesLike('quiet', 50, { callers: 5, neighbours: 10 }),
      ...servicesLike('busy', 48, { callers: 20, neighbours: 40 }),
      ['auth', stat(25, 25)],
      ['almost', stat(24, 25)],
    ]);

    expect(findSharedServices({ stats })).toEqual(new Set(['auth']));
  });

  it('shares a service with far more neighbours than is typical, even if nothing calls it', () => {
    const stats = new Map([
      ...servicesLike('svc', 100, { callers: 1, neighbours: 2 }),
      ['gateway', stat(0, 40)],
    ]);

    expect(findSharedServices({ stats })).toEqual(new Set(['gateway']));
  });

  it('shares a gateway even when services called by most of the map have far more neighbours', () => {
    // Counted with the platform services, neighbours average 7.5 with a standard deviation of 7.7,
    // so the gateway's 30 would fall under the bar. Without them, the bar is about 13.
    const stats = new Map([
      ...servicesLike('svc', 100, { callers: 3, neighbours: 6 }),
      ...servicesLike('platform', 3, { callers: 50, neighbours: 50 }),
      ['gateway', stat(0, 30)],
    ]);

    expect(findSharedServices({ stats })).toEqual(
      new Set(['platform-0', 'platform-1', 'platform-2', 'gateway'])
    );
  });

  it('needs at least 3 times the median, so an ordinary busy service stays in its group', () => {
    // neighbours cluster tightly around 7, so 15 is far above the mean plus 3 standard deviations,
    // but not 3 times the typical service
    const stats = new Map([
      ...servicesLike('svc', 100, { callers: 3, neighbours: 7 }),
      ['busy', stat(8, 15)],
      ['gateway', stat(0, 30)],
    ]);

    expect(findSharedServices({ stats })).toEqual(new Set(['gateway']));
  });

  it('keeps each team gateway out when every team is a gateway in front of its own backends', () => {
    // 15 teams: a gateway with 19 backends and 2 neighbouring gateways each way (23 neighbours),
    // in front of backends with a single neighbour. Counting the backends, the bar would be about
    // 16, and every gateway would be shared.
    const stats = new Map([
      ...servicesLike('backend', 285, { callers: 1, neighbours: 1 }),
      ...servicesLike('gateway', 15, { callers: 2, neighbours: 23 }),
    ]);

    expect(findSharedServices({ stats })).toEqual(new Set());
  });

  it('needs at least 10 neighbours, however few the rest have', () => {
    // the typical service has 1 neighbour, so 9 is far above the mean plus 3 standard deviations
    const stats = new Map([
      ...servicesLike('svc', 100, { callers: 1, neighbours: 1 }),
      ['local-hub', stat(9, 9)],
    ]);

    expect(findSharedServices({ stats })).toEqual(new Set());
  });

  it('shares at most 5% of the map, those with the most neighbours, then by name', () => {
    const stats = new Map([
      ...servicesLike('svc', 92, { callers: 1, neighbours: 2 }),
      ['hub-a', stat(30, 30)],
      ['hub-b', stat(30, 31)],
      ['hub-c', stat(30, 32)],
      ['hub-d', stat(30, 33)],
      ['hub-e', stat(30, 33)],
      ['hub-f', stat(30, 34)],
      ['hub-g', stat(30, 35)],
      ['hub-h', stat(30, 36)],
    ]);

    // 100 services: at most 5, hub-d and hub-e tied on 33 neighbours, hub-d first by name
    expect(findSharedServices({ stats })).toEqual(
      new Set(['hub-h', 'hub-g', 'hub-f', 'hub-d', 'hub-e'])
    );
  });

  it('shares nothing on a map where no service stands out', () => {
    const stats = new Map(servicesLike('svc', 100, { callers: 3, neighbours: 6 }));

    expect(findSharedServices({ stats })).toEqual(new Set());
  });
});
