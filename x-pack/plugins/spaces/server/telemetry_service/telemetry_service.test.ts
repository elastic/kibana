/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { coreMock, loggingSystemMock } from 'src/core/server/mocks';
import { TelemetryService } from '.';
import { TelemetryClient } from '../lib/telemetry_client';
import { SPACES_TELEMETRY_TYPE } from '../constants';

describe('TelemetryService', () => {
  const mockLogger = loggingSystemMock.createLogger();

  describe('#setup', () => {
    const setup = async () => {
      const core = coreMock.createSetup();
      const telemetryService = await new TelemetryService(mockLogger).setup(core);
      return { core, telemetryService };
    };

    it('creates internal repository', async () => {
      const { core } = await setup();

      const [{ savedObjects }] = await core.getStartServices();
      expect(savedObjects.createInternalRepository).toHaveBeenCalledTimes(1);
      expect(savedObjects.createInternalRepository).toHaveBeenCalledWith([SPACES_TELEMETRY_TYPE]);
    });

    describe('#getClient', () => {
      it('returns client', async () => {
        const { telemetryService } = await setup();

        const telemetryClient = await telemetryService.getClient();
        expect(telemetryClient).toBeInstanceOf(TelemetryClient);
      });
    });
  });
});
