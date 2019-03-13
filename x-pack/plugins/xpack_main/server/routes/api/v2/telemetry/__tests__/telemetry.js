/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import expect from 'expect.js';
import sinon from 'sinon';

import { getTelemetry, isAllowedToViewUnencryptedTelemetryData } from '../telemetry';

describe('telemetry', () => {

  describe('getTelemetry', () => {

    const req = { };
    const config = { };
    const start = 'start';
    const end = 'end';
    let _getAllStats;
    let _getLocalStats;

    beforeEach(() => {
      config.get = sinon.stub();
      _getAllStats = sinon.stub();
      _getLocalStats = sinon.stub();
    });

    it('returns monitoring telemetry when possible', async () => {
      const response = [ { totally: 'real' } ];

      config.get.withArgs('xpack.monitoring.enabled').returns(true);
      _getAllStats.withArgs(req, start, end).returns(response);

      expect(await getTelemetry(req, config, start, end, { _getAllStats, _getLocalStats })).to.be(response);

      expect(config.get.calledOnce).to.be(true);
      expect(_getAllStats.calledOnce).to.be(true);
      expect(_getLocalStats.calledOnce).to.be(false);
    });

    it('uses local and ignores monitoring telemetry when empty', async () => {
      const response = { collection: 'local' };

      config.get.withArgs('xpack.monitoring.enabled').returns(true);
      _getAllStats.withArgs(req, start, end).returns([]);
      _getLocalStats.withArgs(req).returns(response);

      expect(await getTelemetry(req, config, start, end, { _getAllStats, _getLocalStats })).to.eql([ response ]);

      expect(config.get.calledOnce).to.be(true);
      expect(_getAllStats.calledOnce).to.be(true);
      expect(_getLocalStats.calledOnce).to.be(true);
    });

    it('uses local and ignores monitoring telemetry when invalid', async () => {
      const response = { collection: 'local' };

      config.get.withArgs('xpack.monitoring.enabled').returns(true);
      _getAllStats.withArgs(req, start, end).returns({ not: 'an array' });
      _getLocalStats.withArgs(req).returns(response);

      expect(await getTelemetry(req, config, start, end, { _getAllStats, _getLocalStats })).to.eql([ response ]);

      expect(config.get.calledOnce).to.be(true);
      expect(_getAllStats.calledOnce).to.be(true);
      expect(_getLocalStats.calledOnce).to.be(true);
    });

    it('uses local when monitoring is disabled', async () => {
      const response = { collection: 'local' };

      config.get.withArgs('xpack.monitoring.enabled').returns(false);
      _getLocalStats.withArgs(req).returns(response);

      expect(await getTelemetry(req, config, start, end, { _getAllStats, _getLocalStats })).to.eql([ response ]);

      expect(config.get.calledOnce).to.be(true);
      expect(_getAllStats.calledOnce).to.be(false);
      expect(_getLocalStats.calledOnce).to.be(true);
    });

  });

  describe('isAllowedToViewUnencryptedTelemetryData', () => {
    function createMockReq(roles) {
      return { auth: { credentials: { roles } } };
    }

    const allowedRoles = [
      'superuser',
      'remote_monitoring_collector',
      'remote_monitoring_agent',
    ];

    allowedRoles.forEach(role => {
      it(`returns true for the role ${role}`, () => {
        const mockReq = createMockReq([role]);
        const result = isAllowedToViewUnencryptedTelemetryData(mockReq);
        expect(result).to.be(true);
      });
    });

    it('returns true on multiple valid roles', () => {
      const mockReq = createMockReq(allowedRoles);
      const result = isAllowedToViewUnencryptedTelemetryData(mockReq);
      expect(result).to.be(true);
    });

    it('returns true on one valid role with multiple roles', () => {
      const mockReq = createMockReq([allowedRoles[0], 'invalid_role']);
      const result = isAllowedToViewUnencryptedTelemetryData(mockReq);
      expect(result).to.be(true);
    });

    it('returns false on empty roles', () => {
      const mockReq = createMockReq([]);
      const result = isAllowedToViewUnencryptedTelemetryData(mockReq);
      expect(result).to.be(false);
    });

    it('returns false on invalid roles', () => {
      const mockReq = createMockReq(['invalid_role']);
      const result = isAllowedToViewUnencryptedTelemetryData(mockReq);
      expect(result).to.be(false);
    });

  });

});
