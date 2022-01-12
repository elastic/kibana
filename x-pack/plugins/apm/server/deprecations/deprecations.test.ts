/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { kibanaPackageJson } from '@kbn/utils';

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
      const deprecationsCallback = getDeprecations({ branch: 'main' });
      const deprecations = await deprecationsCallback(deprecationContext);
      expect(deprecations).toEqual([]);
    });
  });

  describe('when running on cloud without cloud agent policy', () => {
    it('returns no deprecations', async () => {
      const deprecationsCallback = getDeprecations({
        branch: 'main',
        cloudSetup: { isCloudEnabled: true } as unknown as CloudSetup,
        fleet: {
          start: () => ({
            agentPolicyService: { get: () => undefined },
          }),
        } as unknown as APMRouteHandlerResources['plugins']['fleet'],
      });
      const deprecations = await deprecationsCallback(deprecationContext);
      expect(deprecations).toEqual([]);
    });
  });

  describe('when running on cloud with cloud agent policy and without apm integration', () => {
    it('returns deprecations', async () => {
      const deprecationsCallback = getDeprecations({
        branch: 'main',
        cloudSetup: { isCloudEnabled: true } as unknown as CloudSetup,
        fleet: {
          start: () => ({
            agentPolicyService: {
              get: () =>
                ({
                  id: 'foo',
                  package_policies: [''],
                } as AgentPolicy),
            },
          }),
        } as unknown as APMRouteHandlerResources['plugins']['fleet'],
      });
      const deprecations = await deprecationsCallback(deprecationContext);
      expect(deprecations).not.toEqual([]);
      // TODO: remove when docs support "main"
      if (kibanaPackageJson.branch === 'main') {
        for (const { documentationUrl } of deprecations) {
          expect(documentationUrl).toMatch(/\/master\//);
          expect(documentationUrl).not.toMatch(/\/main\//);
        }
      }
    });
  });

  describe('when running on cloud with cloud agent policy and apm integration', () => {
    it('returns no deprecations', async () => {
      const deprecationsCallback = getDeprecations({
        branch: 'main',
        cloudSetup: { isCloudEnabled: true } as unknown as CloudSetup,
        fleet: {
          start: () => ({
            agentPolicyService: {
              get: () =>
                ({
                  id: 'foo',
                  package_policies: [{ package: { name: 'apm' } }],
                } as AgentPolicy),
            },
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
        branch: 'main',
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
