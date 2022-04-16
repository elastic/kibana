/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Capabilities } from '@kbn/core/public';
import { ApmPluginSetupDeps } from '../../plugin';
import { getAlertingCapabilities } from './get_alerting_capabilities';

describe('getAlertingCapabilities', () => {
  describe('when the alerting plugin is not enabled', () => {
    it('returns isAlertingAvailable = false', () => {
      expect(
        getAlertingCapabilities(
          {} as ApmPluginSetupDeps,
          { apm: {} } as unknown as Capabilities
        ).isAlertingAvailable
      ).toEqual(false);
    });
  });
});
