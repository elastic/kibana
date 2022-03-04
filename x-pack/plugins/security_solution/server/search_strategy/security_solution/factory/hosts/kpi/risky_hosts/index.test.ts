/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { hostsKpiRiskyHosts } from '.';
import * as buildQuery from './query.hosts_kpi_risky_hosts.dsl';
import { mockOptions } from './__mocks__';

describe('buildHostsKpiRiskyHostsQuery search strategy', () => {
  const buildHostsKpiRiskyHostsQuery = jest.spyOn(buildQuery, 'buildHostsKpiRiskyHostsQuery');

  describe('buildDsl', () => {
    test('should build dsl query', () => {
      hostsKpiRiskyHosts.buildDsl(mockOptions);
      expect(buildHostsKpiRiskyHostsQuery).toHaveBeenCalledWith(mockOptions);
    });
  });
});
