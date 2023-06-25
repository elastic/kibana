/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Rule } from '@kbn/alerting-plugin/common';
import { handleCoverageOverviewRequest } from './handle_coverage_overview_request';

describe('handleCoverageOverviewRequest', () => {
  it('processes rules in chunks', async () => {
    const rulesClientMock = {
      find: jest
        .fn()
        .mockReturnValueOnce({
          total: 25555,
          data: generateRules(10000),
        })
        .mockReturnValueOnce({
          total: 25555,
          data: generateRules(10000),
        })
        .mockReturnValueOnce({
          total: 25555,
          data: generateRules(10000),
        }),
    };
    const resolveParameters = jest.fn().mockReturnValue({});
    const resolveDependencies = jest.fn().mockResolvedValue({
      rulesClient: rulesClientMock,
    });

    await handleCoverageOverviewRequest({ resolveParameters, resolveDependencies });

    expect(rulesClientMock.find).toHaveBeenCalledTimes(3);
    expect(rulesClientMock.find).toHaveBeenCalledWith({
      options: expect.objectContaining({
        page: 1,
        perPage: 10000,
      }),
    });
    expect(rulesClientMock.find).toHaveBeenCalledWith({
      options: expect.objectContaining({
        page: 2,
        perPage: 10000,
      }),
    });
    expect(rulesClientMock.find).toHaveBeenCalledWith({
      options: expect.objectContaining({
        page: 3,
        perPage: 10000,
      }),
    });
  });

  it('request only the first chunk if there are less rules than the chunk size', async () => {
    const rulesClientMock = {
      find: jest.fn().mockReturnValue({
        total: 9000,
        data: generateRules(9000),
      }),
    };
    const resolveParameters = jest.fn().mockReturnValue({});
    const resolveDependencies = jest.fn().mockResolvedValue({
      rulesClient: rulesClientMock,
    });

    await handleCoverageOverviewRequest({ resolveParameters, resolveDependencies });

    expect(rulesClientMock.find).toHaveBeenCalledTimes(1);
    expect(rulesClientMock.find).toHaveBeenCalledWith({
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
