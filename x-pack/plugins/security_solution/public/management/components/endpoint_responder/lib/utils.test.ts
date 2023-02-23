/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { parsedPidOrEntityIdParameter, parsedExecuteTimeout } from './utils';

describe('Endpoint Responder - Utilities', () => {
  describe('when using parsedPidOrEntityIdParameter()', () => {
    it('should parse a pid as a number and return proper params', () => {
      const parameters = parsedPidOrEntityIdParameter({ pid: ['123'] });
      expect(parameters).toEqual({ pid: 123 });
    });

    it('should parse an entity id correctly and return proper params', () => {
      const parameters = parsedPidOrEntityIdParameter({ entityId: ['123qwe'] });
      expect(parameters).toEqual({ entity_id: '123qwe' });
    });

    it('should return entity id with empty string if no params are defined', () => {
      const parameters = parsedPidOrEntityIdParameter({});
      expect(parameters).toEqual({ entity_id: '' });
    });
  });

  describe('#parsedExecuteTimeout', () => {
    it('should return `undefined` if no timeout is defined', () => {
      expect(parsedExecuteTimeout()).toEqual(undefined);
    });
    it('should return `undefined` if timeout does not match pattern', () => {
      expect(parsedExecuteTimeout('23d')).toEqual(undefined);
    });
    it('should return correct milliseconds for hours', () => {
      expect(parsedExecuteTimeout('23h')).toEqual(82800000);
    });
    it('should return correct milliseconds for minutes', () => {
      expect(parsedExecuteTimeout('23m')).toEqual(1380000);
    });
    it('should return correct milliseconds for seconds', () => {
      expect(parsedExecuteTimeout('23s')).toEqual(23000);
    });
  });
});
