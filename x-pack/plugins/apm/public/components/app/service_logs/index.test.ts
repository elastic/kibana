/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { getInfrastructureKQLFilter } from './';

describe('service logs', () => {
  describe('getInfrastructureKQLFilter', () => {
    it('filter by container id', () => {
      expect(
        getInfrastructureKQLFilter({
          serviceInfrastructure: {
            containerIds: ['foo', 'bar'],
            hostNames: ['baz', `quz`],
          },
        })
      ).toEqual('container.id: "foo" or container.id: "bar"');
    });
    it('filter by host names', () => {
      expect(
        getInfrastructureKQLFilter({
          serviceInfrastructure: {
            containerIds: [],
            hostNames: ['baz', `quz`],
          },
        })
      ).toEqual('host.name: "baz" or host.name: "quz"');
    });
  });
});
