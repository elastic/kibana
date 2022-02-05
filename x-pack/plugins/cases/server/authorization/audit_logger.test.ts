/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { auditLoggerMock } from '../../../../plugins/security/server/audit/mocks';
import { Operations } from '.';
import { AuthorizationAuditLogger } from './audit_logger';
import { ReadOperations } from './types';

describe('audit_logger', () => {
  it('creates a failure message without any owners', () => {
    expect(
      AuthorizationAuditLogger.createFailureMessage({
        owners: [],
        operation: Operations.createCase,
      })
    ).toBe('Unauthorized to create case of any owner');
  });

  it('creates a failure message with owners', () => {
    expect(
      AuthorizationAuditLogger.createFailureMessage({
        owners: ['a', 'b'],
        operation: Operations.createCase,
      })
    ).toBe('Unauthorized to create case with owners: "a, b"');
  });

  describe('log function', () => {
    const mockLogger = auditLoggerMock.create();
    let logger: AuthorizationAuditLogger;

    beforeEach(() => {
      mockLogger.log.mockReset();
      logger = new AuthorizationAuditLogger(mockLogger);
    });

    it('does not throw an error when the underlying audit logger is undefined', () => {
      const authLogger = new AuthorizationAuditLogger();
      jest.spyOn(authLogger, 'log');

      expect(() => {
        authLogger.log({
          operation: Operations.createCase,
          entity: {
            owner: 'a',
            id: '1',
          },
        });
      }).not.toThrow();

      expect(authLogger.log).toHaveBeenCalledTimes(1);
    });

    it('logs a message with a saved object ID in the message field', () => {
      logger.log({
        operation: Operations.createCase,
        entity: {
          owner: 'a',
          id: '1',
        },
      });
      expect(mockLogger.log.mock.calls[0][0]?.message).toContain('[id=1]');
    });

    it('creates the owner part of the message when no owners are specified', () => {
      logger.log({
        operation: Operations.createCase,
      });

      expect(mockLogger.log.mock.calls[0][0]?.message).toContain('as any owners');
    });

    it('creates the owner part of the message when an owner is specified', () => {
      logger.log({
        operation: Operations.createCase,
        entity: {
          owner: 'a',
          id: '1',
        },
      });

      expect(mockLogger.log.mock.calls[0][0]?.message).toContain('as owner "a"');
    });

    it('creates a failure message when passed an error', () => {
      logger.log({
        operation: Operations.createCase,
        entity: {
          owner: 'a',
          id: '1',
        },
        error: new Error('error occurred'),
      });

      expect(mockLogger.log.mock.calls[0][0]?.message).toBe(
        'Failed attempt to create cases [id=1] as owner "a"'
      );

      expect(mockLogger.log.mock.calls[0][0]?.event?.outcome).toBe('failure');
    });

    it('creates a write operation message', () => {
      logger.log({
        operation: Operations.createCase,
        entity: {
          owner: 'a',
          id: '1',
        },
      });

      expect(mockLogger.log.mock.calls[0][0]?.message).toBe(
        'User is creating cases [id=1] as owner "a"'
      );

      expect(mockLogger.log.mock.calls[0][0]?.event?.outcome).toBe('unknown');
    });

    it('creates a read operation message', () => {
      logger.log({
        operation: Operations.getCase,
        entity: {
          owner: 'a',
          id: '1',
        },
      });

      expect(mockLogger.log.mock.calls[0][0]?.message).toBe(
        'User has accessed cases [id=1] as owner "a"'
      );

      expect(mockLogger.log.mock.calls[0][0]?.event?.outcome).toBe('success');
    });

    describe('event structure', () => {
      // I would have preferred to do these as match inline but that isn't supported because this is essentially a for loop
      // for reference: https://github.com/facebook/jest/issues/9409#issuecomment-629272237

      // This loops through all operation keys
      it.each(Object.keys(Operations))(
        `creates the correct audit event for operation: "%s" without an error or entity`,
        (operationKey) => {
          // forcing the cast here because using a string throws a type error
          const key = operationKey as ReadOperations;
          logger.log({
            operation: Operations[key],
          });
          expect(mockLogger.log.mock.calls[0][0]).toMatchSnapshot();
        }
      );

      // This loops through all operation keys
      it.each(Object.keys(Operations))(
        `creates the correct audit event for operation: "%s" with an error but no entity`,
        (operationKey) => {
          // forcing the cast here because using a string throws a type error
          const key = operationKey as ReadOperations;
          logger.log({
            operation: Operations[key],
            error: new Error('an error'),
          });
          expect(mockLogger.log.mock.calls[0][0]).toMatchSnapshot();
        }
      );

      // This loops through all operation keys
      it.each(Object.keys(Operations))(
        `creates the correct audit event for operation: "%s" with an error and entity`,
        (operationKey) => {
          // forcing the cast here because using a string throws a type error
          const key = operationKey as ReadOperations;
          logger.log({
            operation: Operations[key],
            entity: {
              owner: 'awesome',
              id: '1',
            },
            error: new Error('an error'),
          });
          expect(mockLogger.log.mock.calls[0][0]).toMatchSnapshot();
        }
      );

      // This loops through all operation keys
      it.each(Object.keys(Operations))(
        `creates the correct audit event for operation: "%s" without an error but with an entity`,
        (operationKey) => {
          // forcing the cast here because using a string throws a type error
          const key = operationKey as ReadOperations;
          logger.log({
            operation: Operations[key],
            entity: {
              owner: 'super',
              id: '5',
            },
          });
          expect(mockLogger.log.mock.calls[0][0]).toMatchSnapshot();
        }
      );
    });
  });
});
