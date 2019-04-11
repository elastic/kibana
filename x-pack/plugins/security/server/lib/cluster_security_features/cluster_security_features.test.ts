/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import * as Rx from 'rxjs';
import {
  XPackUsageContract,
  XPackUsageResponse,
} from '../../../../xpack_main/server/lib/xpack_usage';
import { ClusterSecurityFeatures } from './cluster_security_features';

function createMockXPackUsage(
  observable = Rx.of<XPackUsageResponse | undefined>(undefined)
): XPackUsageContract {
  return {
    getUsage$() {
      return observable;
    },
    refreshNow() {
      throw new Error('this should not be called');
    },
  };
}

function buildUsageResponse(): XPackUsageResponse {
  return {
    security: {
      available: true,
      enabled: true,
      realms: {
        saml: {
          enabled: true,
          available: true,
        },
      },
      api_key_service: {
        enabled: true,
      },
      token_service: {
        enabled: true,
      },
      audit: {
        enabled: true,
      },
    },
  };
}

describe('ClusterSecurityFeatures', () => {
  describe('#isSAMLRealmEnabled', () => {
    it('returns false when no usage data is available', () => {
      const instance = new ClusterSecurityFeatures(createMockXPackUsage());
      expect(instance.isSAMLRealmEnabled()).toEqual(false);
    });

    it('returns false when saml is not enabled', () => {
      const response = buildUsageResponse();
      response.security.realms.saml!.enabled = false;

      const instance = new ClusterSecurityFeatures(createMockXPackUsage(Rx.of(response)));
      expect(instance.isSAMLRealmEnabled()).toEqual(false);
    });

    it('returns true when saml is enabled', () => {
      const response = buildUsageResponse();

      const instance = new ClusterSecurityFeatures(createMockXPackUsage(Rx.of(response)));
      expect(instance.isSAMLRealmEnabled()).toEqual(true);
    });

    it('responds to updates', () => {
      const observable = new Rx.Subject<XPackUsageResponse | undefined>();

      const instance = new ClusterSecurityFeatures(createMockXPackUsage(observable));
      expect(instance.isSAMLRealmEnabled()).toEqual(false);

      observable.next(buildUsageResponse());
      expect(instance.isSAMLRealmEnabled()).toEqual(true);
    });
  });

  describe('#isTokenServiceEnabled', () => {
    it('returns false when no usage data is available', () => {
      const instance = new ClusterSecurityFeatures(createMockXPackUsage());
      expect(instance.isTokenServiceEnabled()).toEqual(false);
    });

    it('returns false when token service is not enabled', () => {
      const response = buildUsageResponse();
      response.security.token_service.enabled = false;

      const instance = new ClusterSecurityFeatures(createMockXPackUsage(Rx.of(response)));
      expect(instance.isTokenServiceEnabled()).toEqual(false);
    });

    it('returns true when token service is enabled', () => {
      const response = buildUsageResponse();

      const instance = new ClusterSecurityFeatures(createMockXPackUsage(Rx.of(response)));
      expect(instance.isTokenServiceEnabled()).toEqual(true);
    });

    it('responds to updates', () => {
      const observable = new Rx.Subject<XPackUsageResponse | undefined>();

      const instance = new ClusterSecurityFeatures(createMockXPackUsage(observable));
      expect(instance.isTokenServiceEnabled()).toEqual(false);

      observable.next(buildUsageResponse());
      expect(instance.isTokenServiceEnabled()).toEqual(true);
    });
  });

  describe('#isAPIKeyServiceEnabled', () => {
    it('returns false when no usage data is available', () => {
      const instance = new ClusterSecurityFeatures(createMockXPackUsage());
      expect(instance.isAPIKeyServiceEnabled()).toEqual(false);
    });

    it('returns false when api service is not enabled', () => {
      const response = buildUsageResponse();
      response.security.api_key_service.enabled = false;

      const instance = new ClusterSecurityFeatures(createMockXPackUsage(Rx.of(response)));
      expect(instance.isAPIKeyServiceEnabled()).toEqual(false);
    });

    it('returns true when api service is enabled', () => {
      const response = buildUsageResponse();

      const instance = new ClusterSecurityFeatures(createMockXPackUsage(Rx.of(response)));
      expect(instance.isAPIKeyServiceEnabled()).toEqual(true);
    });

    it('responds to updates', () => {
      const observable = new Rx.Subject<XPackUsageResponse | undefined>();

      const instance = new ClusterSecurityFeatures(createMockXPackUsage(observable));
      expect(instance.isAPIKeyServiceEnabled()).toEqual(false);

      observable.next(buildUsageResponse());
      expect(instance.isAPIKeyServiceEnabled()).toEqual(true);
    });
  });
});
