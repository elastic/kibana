/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Rule } from '@kbn/alerting-plugin/common';
import { rulesClientMock } from '@kbn/alerting-plugin/server/mocks';
import { handleCoverageOverviewRequest } from './handle_coverage_overview_request';

describe('handleCoverageOverviewRequest', () => {
  let rulesClient: ReturnType<typeof rulesClientMock.create>;

  beforeEach(() => {
    rulesClient = rulesClientMock.create();
  });

  it('processes rules in chunks', async () => {
    rulesClient.find
      .mockResolvedValueOnce({
        total: 25555,
        page: 1,
        perPage: 10000,
        data: generateRules(10000),
      })
      .mockResolvedValueOnce({
        total: 25555,
        page: 2,
        perPage: 10000,
        data: generateRules(10000),
      })
      .mockResolvedValueOnce({
        total: 25555,
        page: 3,
        perPage: 10000,
        data: generateRules(10000),
      });

    await handleCoverageOverviewRequest({
      params: {},
      deps: {
        rulesClient,
      },
    });

    expect(rulesClient.find).toHaveBeenCalledTimes(3);
    expect(rulesClient.find).toHaveBeenCalledWith({
      options: expect.objectContaining({
        page: 1,
        perPage: 10000,
      }),
    });
    expect(rulesClient.find).toHaveBeenCalledWith({
      options: expect.objectContaining({
        page: 2,
        perPage: 10000,
      }),
    });
    expect(rulesClient.find).toHaveBeenCalledWith({
      options: expect.objectContaining({
        page: 3,
        perPage: 10000,
      }),
    });
  });

  it('request only the first chunk if there are less rules than the chunk size', async () => {
    rulesClient.find.mockResolvedValueOnce({
      total: 9000,
      page: 1,
      perPage: 10000,
      data: generateRules(9000),
    });

    await handleCoverageOverviewRequest({
      params: {},
      deps: {
        rulesClient,
      },
    });

    expect(rulesClient.find).toHaveBeenCalledTimes(1);
    expect(rulesClient.find).toHaveBeenCalledWith({
      options: expect.objectContaining({
        page: 1,
        perPage: 10000,
      }),
    });
  });
});

function generateRules(count: number): Rule[] {
  const result: Rule[] = [];

  for (let i = 1; i <= count; ++i) {
    result.push({
      name: `rule ${i}`,
      enabled: false,
      params: {},
    } as Rule);
  }

  return result;
}
