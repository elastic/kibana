/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Rule } from '@kbn/alerting-plugin/common';
import { rulesClientMock } from '@kbn/alerting-plugin/server/mocks';
import { findRules } from '../../../logic/search/find_rules';
import { handleCoverageOverviewRequest } from './handle_coverage_overview_request';

jest.mock('../../../logic/search/find_rules');

describe('handleCoverageOverviewRequest', () => {
  it('does not request more than 10k rules', async () => {
    (findRules as jest.Mock)
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
        rulesClient: rulesClientMock.create(),
      },
    });

    expect(findRules).toHaveBeenCalledTimes(1);
    expect(findRules).toHaveBeenCalledWith(
      expect.objectContaining({
        page: 1,
        perPage: 10000,
      })
    );
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
