/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import {
  fetchPage,
  MonitorEnricher,
  MonitorGroups,
  MonitorGroupsFetcher,
  MonitorGroupsPage,
} from '../fetch_page';
import { QueryContext } from '../query_context';
import { MonitorSummary } from '../../../../../common/runtime_types';
import { nextPagination, prevPagination, simpleQueryContext } from './test_helpers';

const simpleFixture: MonitorGroups[] = [
  {
    id: 'foo',
    groups: [
      {
        monitorId: 'foo',
        location: 'foo-loc',
        checkGroup: 'foo-check',
        status: 'up',
        summaryTimestamp: new Date(),
      },
    ],
  },
  {
    id: 'bar',
    groups: [
      {
        monitorId: 'bar',
        location: 'bar-loc',
        checkGroup: 'bar-check',
        status: 'down',
        summaryTimestamp: new Date(),
      },
    ],
  },
];

const simpleFetcher = (monitorGroups: MonitorGroups[]): MonitorGroupsFetcher => {
  return async (queryContext: QueryContext, size: number): Promise<MonitorGroupsPage> => {
    return {
      monitorGroups,
      prevPagePagination: prevPagination(monitorGroups[0].id),
      nextPagePagination: nextPagination(monitorGroups[monitorGroups.length - 1].id),
    };
  };
};

const simpleEnricher = (monitorGroups: MonitorGroups[]): MonitorEnricher => {
  return async (_queryContext: QueryContext, checkGroups: string[]): Promise<MonitorSummary[]> => {
    return checkGroups.map(cg => {
      const monitorGroup = monitorGroups.find(mg => mg.groups.some(g => g.checkGroup === cg))!;
      return {
        monitor_id: monitorGroup.id,
        state: {
          summary: {},
          timestamp: new Date(Date.parse('1999-12-31')).valueOf().toString(),
          url: {},
        },
      };
    });
  };
};

describe('fetching a page', () => {
  it('returns the enriched groups', async () => {
    const res = await fetchPage(
      simpleQueryContext(),
      simpleFetcher(simpleFixture),
      simpleEnricher(simpleFixture)
    );
    expect(res).toMatchInlineSnapshot(`
      Object {
        "items": Array [
          Object {
            "monitor_id": "foo",
            "state": Object {
              "summary": Object {},
              "timestamp": "946598400000",
              "url": Object {},
            },
          },
          Object {
            "monitor_id": "bar",
            "state": Object {
              "summary": Object {},
              "timestamp": "946598400000",
              "url": Object {},
            },
          },
        ],
        "nextPagePagination": Object {
          "cursorDirection": "AFTER",
          "cursorKey": "bar",
          "sortOrder": "ASC",
        },
        "prevPagePagination": Object {
          "cursorDirection": "BEFORE",
          "cursorKey": "foo",
          "sortOrder": "ASC",
        },
      }
    `);
  });
});
