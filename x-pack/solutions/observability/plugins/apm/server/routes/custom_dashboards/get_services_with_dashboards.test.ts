/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { estypes } from '@elastic/elasticsearch';
import { loggerMock } from '@kbn/logging-mocks';
import { getServicesWithDashboards } from './get_services_with_dashboards';
import type { APMEventClient } from '../../lib/helpers/create_es_client/create_apm_event_client';
import type { SavedApmCustomDashboard } from '../../../common/custom_dashboards';

/** Shape of the search requests `getServicesWithDashboards` passes to `msearch`. */
interface FilteredSearchRequest {
  query: { bool: { filter: estypes.QueryDslQueryContainer[] } };
}

const start = new Date('2023-08-22T00:00:00.000Z').valueOf();
const end = new Date('2023-08-22T00:15:00.000Z').valueOf();

function createDashboard(id: string, kuery: string): SavedApmCustomDashboard {
  return {
    id,
    dashboardSavedObjectId: `so-${id}`,
    kuery,
    serviceNameFilterEnabled: true,
    serviceEnvironmentFilterEnabled: true,
    updatedAt: 0,
  };
}

function createApmEventClient(hitsPerSearch: boolean[]) {
  const msearch = jest.fn().mockResolvedValue({
    responses: hitsPerSearch.map((hasHits) => ({
      hits: { hits: hasHits ? [{ _source: {} }] : [] },
    })),
  });

  return { msearch } as unknown as APMEventClient & { msearch: jest.Mock };
}

describe('getServicesWithDashboards', () => {
  const logger = loggerMock.create();

  beforeEach(() => {
    loggerMock.clear(logger);
  });

  it('returns every dashboard whose search matched', async () => {
    const allLinkedCustomDashboards = [
      createDashboard('dashboard-1', 'service.name: "synth-go"'),
      createDashboard('dashboard-2', 'service.name: "synth-go"'),
    ];
    const apmEventClient = createApmEventClient([true, true]);

    const result = await getServicesWithDashboards({
      apmEventClient,
      allLinkedCustomDashboards,
      serviceName: 'synth-go',
      start,
      end,
      logger,
    });

    expect(result).toEqual(allLinkedCustomDashboards);

    const [operationName, ...searches] = apmEventClient.msearch.mock.calls[0] as [
      string,
      ...FilteredSearchRequest[]
    ];
    expect(operationName).toBe('get_services_with_dashboards');
    expect(searches).toHaveLength(2);
    searches.forEach((search) => {
      expect(search.query.bool.filter).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ bool: expect.anything() }),
          { term: { 'service.name': 'synth-go' } },
        ])
      );
    });
  });

  it('filters out dashboards whose search returned no hits', async () => {
    const allLinkedCustomDashboards = [
      createDashboard('dashboard-1', 'service.name: "synth-go"'),
      createDashboard('dashboard-2', 'service.name: "synth-java"'),
    ];
    const apmEventClient = createApmEventClient([true, false]);

    const result = await getServicesWithDashboards({
      apmEventClient,
      allLinkedCustomDashboards,
      serviceName: 'synth-go',
      start,
      end,
      logger,
    });

    expect(result).toEqual([allLinkedCustomDashboards[0]]);
  });

  // https://github.com/elastic/kibana/issues/245023
  it('skips a dashboard with an unparseable stored kuery instead of throwing', async () => {
    const brokenDashboard = createDashboard(
      'dashboard-broken',
      'service.name: unknown_service:java'
    );
    const validDashboard = createDashboard('dashboard-valid', 'service.name: "synth-go"');
    const apmEventClient = createApmEventClient([true]);

    const result = await getServicesWithDashboards({
      apmEventClient,
      allLinkedCustomDashboards: [brokenDashboard, validDashboard],
      serviceName: 'synth-go',
      start,
      end,
      logger,
    });

    expect(result).toEqual([validDashboard]);
    expect(apmEventClient.msearch).toHaveBeenCalledTimes(1);
    expect(apmEventClient.msearch.mock.calls[0]).toHaveLength(2);
    expect(logger.warn).toHaveBeenCalledTimes(1);
    expect(logger.warn).toHaveBeenCalledWith(expect.stringContaining('dashboard-broken'));
  });

  it('keeps responses aligned with dashboards when a middle dashboard is skipped', async () => {
    const first = createDashboard('dashboard-1', 'service.name: "synth-go"');
    const broken = createDashboard('dashboard-broken', 'service.name: unknown_service:java');
    const third = createDashboard('dashboard-3', 'service.name: "synth-go"');
    // Only the second of the two remaining searches matches.
    const apmEventClient = createApmEventClient([false, true]);

    const result = await getServicesWithDashboards({
      apmEventClient,
      allLinkedCustomDashboards: [first, broken, third],
      serviceName: 'synth-go',
      start,
      end,
      logger,
    });

    expect(result).toEqual([third]);
  });

  it('returns an empty list without querying when there are no linked dashboards', async () => {
    const apmEventClient = createApmEventClient([]);

    const result = await getServicesWithDashboards({
      apmEventClient,
      allLinkedCustomDashboards: [],
      serviceName: 'synth-go',
      start,
      end,
      logger,
    });

    expect(result).toEqual([]);
    expect(apmEventClient.msearch).not.toHaveBeenCalled();
  });

  it('returns an empty list without querying when every stored kuery is unparseable', async () => {
    const apmEventClient = createApmEventClient([]);

    const result = await getServicesWithDashboards({
      apmEventClient,
      allLinkedCustomDashboards: [
        createDashboard('dashboard-broken-1', 'service.name: unknown_service:java'),
        createDashboard('dashboard-broken-2', 'service.name: unknown_service:dotnet'),
      ],
      serviceName: 'synth-go',
      start,
      end,
      logger,
    });

    expect(result).toEqual([]);
    expect(apmEventClient.msearch).not.toHaveBeenCalled();
    expect(logger.warn).toHaveBeenCalledTimes(2);
  });
});
