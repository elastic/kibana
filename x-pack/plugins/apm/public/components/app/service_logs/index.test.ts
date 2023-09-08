/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { ENVIRONMENT_ALL } from '../../../../common/environment_filter_values';
import { getInfrastructureKQLFilter } from '.';

describe('service logs', () => {
  const serviceName = 'opbeans-node';
  const environment = 'production';

  describe('getInfrastructureKQLFilter', () => {
    it('filter by service name and environment', () => {
      expect(
        getInfrastructureKQLFilter({
          data: {
            containerIds: [],
            hostNames: [],
            podNames: [],
          },
          serviceName,
          environment,
        })
      ).toEqual(
        '(service.name: "opbeans-node" and service.environment: "production") or (service.name: "opbeans-node" and not service.environment: *)'
      );
    });

    it('does not filter by environment all', () => {
      expect(
        getInfrastructureKQLFilter({
          data: {
            containerIds: [],
            hostNames: [],
            podNames: [],
          },
          serviceName,
          environment: ENVIRONMENT_ALL.value,
        })
      ).toEqual('service.name: "opbeans-node"');
    });

    it('filter by container id as fallback', () => {
      expect(
        getInfrastructureKQLFilter({
          data: {
            containerIds: ['foo', 'bar'],
            hostNames: ['baz', `quz`],
            podNames: [],
          },
          serviceName,
          environment,
        })
      ).toEqual(
        '(service.name: "opbeans-node" and service.environment: "production") or (service.name: "opbeans-node" and not service.environment: *) or ((container.id: "foo" or container.id: "bar") and not service.name: *)'
      );
    });

    it('does not filter by host names as fallback', () => {
      expect(
        getInfrastructureKQLFilter({
          data: {
            containerIds: [],
            hostNames: ['baz', `quz`],
            podNames: [],
          },
          serviceName,
          environment,
        })
      ).toEqual(
        '(service.name: "opbeans-node" and service.environment: "production") or (service.name: "opbeans-node" and not service.environment: *)'
      );
    });
  });
});
