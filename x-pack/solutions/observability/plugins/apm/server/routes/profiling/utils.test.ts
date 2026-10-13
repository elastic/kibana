/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { HOST_NAME } from '../../../common/es_fields/apm';
import { getHostsProfilingKuery, hostNamesToKuery } from './utils';

describe('profiling utils', () => {
  describe('hostNamesToKuery', () => {
    it('returns a single hostname', () => {
      expect(hostNamesToKuery(['foo'])).toEqual(`${HOST_NAME} : "foo"`);
    });

    it('returns multiple hostnames', () => {
      expect(hostNamesToKuery(['foo', 'bar', 'baz'])).toEqual(
        `${HOST_NAME} : "foo" OR ${HOST_NAME} : "bar" OR ${HOST_NAME} : "baz"`
      );
    });

    it('return empty string when no hostname', () => {
      expect(hostNamesToKuery([])).toEqual('');
    });
  });

  describe('getHostsProfilingKuery', () => {
    it('filters by the containers when there are some', () => {
      expect(
        getHostsProfilingKuery({
          hostNames: ['host-1'],
          containerIds: ['c-1', 'c-2'],
          kuery: 'a : b',
        })
      ).toBe('(container.id : "c-1" OR container.id : "c-2") AND a : b');
    });

    it('filters by the hosts when there are no containers', () => {
      expect(getHostsProfilingKuery({ hostNames: ['host-1'], containerIds: [], kuery: '' })).toBe(
        '(host.name : "host-1")'
      );
    });
  });
});
