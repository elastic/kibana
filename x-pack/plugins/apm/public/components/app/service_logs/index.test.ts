/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { getInfrastructureKQLFilter } from '.';

describe('service logs', () => {
  const serviceName = 'opbeans-node';

  describe('getInfrastructureKQLFilter', () => {
    it('filter by service name', () => {
      expect(
        getInfrastructureKQLFilter(
          {
            serviceInfrastructure: {
              containerIds: [],
              hostNames: [],
            },
          },
          serviceName
        )
      ).toEqual('service.name: "opbeans-node"');
    });

    it('filter by container id as fallback', () => {
      expect(
        getInfrastructureKQLFilter(
          {
            serviceInfrastructure: {
              containerIds: ['foo', 'bar'],
              hostNames: ['baz', `quz`],
            },
          },
          serviceName
        )
      ).toEqual(
        'service.name: "opbeans-node" or (not service.name and (container.id: "foo" or container.id: "bar"))'
      );
    });

    it('filter by host names as fallback', () => {
      expect(
        getInfrastructureKQLFilter(
          {
            serviceInfrastructure: {
              containerIds: [],
              hostNames: ['baz', `quz`],
            },
          },
          serviceName
        )
      ).toEqual(
        'service.name: "opbeans-node" or (not service.name and (host.name: "baz" or host.name: "quz"))'
      );
    });
  });
});
