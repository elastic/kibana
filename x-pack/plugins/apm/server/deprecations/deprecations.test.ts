/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { GetDeprecationsContext } from '../../../../../src/core/server';
import { CloudSetup } from '../../../cloud/server';
import { getDeprecations } from './';
import { APMRouteHandlerResources } from '../';
import { AgentPolicy } from '../../../fleet/common';

const deprecationContext = {
  esClient: {},
  savedObjectsClient: {},
} as GetDeprecationsContext;

describe('getDeprecations', () => {
  describe('when fleet is disabled', () => {
    it('returns no deprecations', async () => {
      const deprecationsCallback = getDeprecations({ branch: 'master' });
      const deprecations = await deprecationsCallback(deprecationContext);
      expect(deprecations).toEqual([]);
    });
  });

  describe('when running on cloud with legacy apm-server', () => {
    it('returns deprecations', async () => {
      const deprecationsCallback = getDeprecations({
        branch: 'master',
        cloudSetup: { isCloudEnabled: true } as unknown as CloudSetup,
        fleet: {
          start: () => ({
            agentPolicyService: { get: () => undefined },
          }),
        } as unknown as APMRouteHandlerResources['plugins']['fleet'],
      });
      const deprecations = await deprecationsCallback(deprecationContext);
      expect(deprecations).not.toEqual([]);
    });
  });

  describe('when running on cloud with fleet', () => {
    it('returns no deprecations', async () => {
      const deprecationsCallback = getDeprecations({
        branch: 'master',
        cloudSetup: { isCloudEnabled: true } as unknown as CloudSetup,
        fleet: {
          start: () => ({
            agentPolicyService: { get: () => ({ id: 'foo' } as AgentPolicy) },
          }),
        } as unknown as APMRouteHandlerResources['plugins']['fleet'],
      });
      const deprecations = await deprecationsCallback(deprecationContext);
      expect(deprecations).toEqual([]);
    });
  });

  describe('when running on prem', () => {
    it('returns no deprecations', async () => {
      const deprecationsCallback = getDeprecations({
        branch: 'master',
        cloudSetup: { isCloudEnabled: false } as unknown as CloudSetup,
        fleet: {
          start: () => ({ agentPolicyService: { get: () => undefined } }),
        } as unknown as APMRouteHandlerResources['plugins']['fleet'],
      });
      const deprecations = await deprecationsCallback(deprecationContext);
      expect(deprecations).toEqual([]);
    });
  });
});
