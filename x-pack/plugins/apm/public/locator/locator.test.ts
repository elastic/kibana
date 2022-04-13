/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { APMLocatorDefinition, APM_APP_LOCATOR_ID } from './locator';
import { APMLocatorPayload } from './types';

const startWith = (str: string) => new RegExp(`^${str}?`);

describe('APMLocatorDefinition', () => {
  it('locator has the right ID and app', async () => {
    const locator = new APMLocatorDefinition();
    const location = await locator.getLocation({ pageId: 'home' });

    expect(locator.id).toBe(APM_APP_LOCATOR_ID);
    expect(location).toMatchObject({
      app: 'apm',
    });
  });

  it('should throw an error when given a wrong pageId', async () => {
    const locator = new APMLocatorDefinition();
    const run = async () => {
      await locator.getLocation({
        // @ts-ignore
        pageId: 'wrong-pageId',
      });
    };

    expect(run()).rejects.toThrow(Error);
  });

  const serviceName = 'example-app';
  const cases: Array<[APMLocatorPayload, RegExp]> = [
    [{ pageId: 'home' }, startWith('/?')],
    [
      { pageId: 'serviceOverview', params: { serviceName } },
      startWith('/services/example-app/overview?'),
    ],
    [
      { pageId: 'serviceTransactionsOverview', params: { serviceName } },
      startWith('/services/example-app/transactions/view?'),
    ],
    [
      { pageId: 'serviceLogsOverview', params: { serviceName } },
      startWith('/services/example-app/logs?'),
    ],
    [
      { pageId: 'serviceMetricsOverview', params: { serviceName } },
      startWith('/services/example-app/metrics?'),
    ],
  ];
  const formatCasesForJestEach = cases.map((aTestCase) => {
    return [aTestCase[0].pageId, aTestCase[0], aTestCase[1]] as const;
  });

  it.each(formatCasesForJestEach)(
    'given the pageId "%s" with and the right params return the correct path',
    async (_, testCase, expected) => {
      const locator = new APMLocatorDefinition();
      const location = await locator.getLocation(testCase);
      expect(location.path).toMatch(expected);
    }
  );

  it('should allow the override of default query params', async () => {
    const locator = new APMLocatorDefinition();

    const location = await locator.getLocation({
      pageId: 'home',
      query: {
        rangeFrom: 'now-15d',
        kuery: 'test-kuery',
      },
    });

    expect(location.path).toBe(
      '/?environment=ENVIRONMENT_ALL&kuery=test-kuery&rangeFrom=now-15d&rangeTo=now'
    );
  });
});
