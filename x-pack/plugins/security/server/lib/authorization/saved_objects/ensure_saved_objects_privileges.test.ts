/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Actions } from '..';
import { ensureSavedObjectsPrivilegesFactory } from '.';
import { DEFAULT_SPACE_ID } from '../../../../../spaces/common/constants';

const createMockErrors = () => {
  const forbiddenError = new Error('Mock ForbiddenError');
  const generalError = new Error('Mock GeneralError');

  return {
    forbiddenError,
    decorateForbiddenError: jest.fn().mockReturnValue(forbiddenError),
    generalError,
    decorateGeneralError: jest.fn().mockReturnValue(generalError),
  };
};

const createMockAuditLogger = () => {
  return {
    savedObjectsAuthorizationFailure: jest.fn(),
    savedObjectsAuthorizationSuccess: jest.fn(),
  };
};

const createMockActions = () => {
  return {
    savedObject: {
      get(type: string, action: string) {
        return `mock-saved_object:${type}/${action}`;
      },
    },
  } as Actions;
};

const createCheckSavedObjectsPrivileges = (
  spacesEnabled: boolean,
  checkPrivilegesImpl: () => Promise<any>
) => {
  const mockAuditLogger = createMockAuditLogger();
  const mockErrors = createMockErrors();
  const mockActions = createMockActions();

  const checkSavedObjectsPrivileges = jest.fn(
    ensureSavedObjectsPrivilegesFactory({
      actionsService: mockActions,
      auditLogger: mockAuditLogger,
      checkPrivilegesWithRequest: () => ({
        atSpace: spacesEnabled
          ? jest.fn().mockImplementationOnce(checkPrivilegesImpl)
          : jest.fn().mockRejectedValue('atSpace should not be called'),
        atSpaces: jest.fn().mockRejectedValue('atSpaces should not be called'),
        globally: !spacesEnabled
          ? jest.fn().mockImplementationOnce(checkPrivilegesImpl)
          : jest.fn().mockRejectedValue('globally should not be called'),
      }),
      errors: mockErrors,
      request: null as any,
      spacesEnabled,
    })
  );

  return {
    mockActions,
    mockAuditLogger,
    mockErrors,
    checkSavedObjectsPrivileges,
  };
};

describe('checkSavedObjectsPrivileges', () => {
  describe('spaces disabled', () => {
    it('checks globally, throwing forbidden error when not authorized', async () => {
      const operation = 'create';
      const username = Symbol();
      const type = 'foo';
      const args = {
        foo: Symbol(),
      };

      const checkPrivilegesImpl = jest.fn(async () => ({
        hasAllRequested: false,
        username,
        privileges: {
          [mockActions.savedObject.get(type, operation)]: false,
        },
      }));

      const {
        checkSavedObjectsPrivileges,
        mockAuditLogger,
        mockActions,
        mockErrors,
      } = createCheckSavedObjectsPrivileges(false, checkPrivilegesImpl);

      await expect(
        checkSavedObjectsPrivileges(type, operation, undefined, args)
      ).rejects.toThrowError(mockErrors.forbiddenError);

      expect(checkPrivilegesImpl).toHaveBeenCalledWith([
        mockActions.savedObject.get(type, operation),
      ]);

      expect(mockAuditLogger.savedObjectsAuthorizationSuccess).not.toHaveBeenCalled();
      expect(mockAuditLogger.savedObjectsAuthorizationFailure).toHaveBeenCalledWith(
        username,
        operation,
        [type],
        [mockActions.savedObject.get(type, operation)],
        args
      );
    });

    it('checks globally, throwing general error when checkPrivileges.globally throws an error', async () => {
      const operation = 'create';
      const type = 'foo';
      const args = {
        foo: Symbol(),
      };

      const checkPrivilegesImpl = jest.fn(async () => {
        throw new Error('test');
      });

      const {
        checkSavedObjectsPrivileges,
        mockAuditLogger,
        mockActions,
        mockErrors,
      } = createCheckSavedObjectsPrivileges(false, checkPrivilegesImpl);

      await expect(
        checkSavedObjectsPrivileges(type, operation, undefined, args)
      ).rejects.toThrowError(mockErrors.generalError);

      expect(checkPrivilegesImpl).toHaveBeenCalledWith([
        mockActions.savedObject.get(type, operation),
      ]);

      expect(mockAuditLogger.savedObjectsAuthorizationSuccess).not.toHaveBeenCalled();
      expect(mockAuditLogger.savedObjectsAuthorizationFailure).not.toHaveBeenCalled();
    });

    it('checks globally, resolving when authorized', async () => {
      const operation = 'create';
      const username = Symbol();
      const type = 'foo';
      const args = {
        foo: Symbol(),
      };

      const checkPrivilegesImpl = jest.fn(async () => ({
        hasAllRequested: true,
        username,
        privileges: {
          [mockActions.savedObject.get(type, operation)]: true,
        },
      }));

      const {
        checkSavedObjectsPrivileges,
        mockAuditLogger,
        mockActions,
      } = createCheckSavedObjectsPrivileges(false, checkPrivilegesImpl);

      await checkSavedObjectsPrivileges(type, operation, undefined, args);

      expect(checkPrivilegesImpl).toHaveBeenCalledWith([
        mockActions.savedObject.get(type, operation),
      ]);

      expect(mockAuditLogger.savedObjectsAuthorizationSuccess).toHaveBeenCalledWith(
        username,
        operation,
        [type],
        args
      );
      expect(mockAuditLogger.savedObjectsAuthorizationFailure).not.toHaveBeenCalled();
    });
  });

  describe('spaces enabled at the default space', () => {
    it('checks at the current space, using an undefined namespace, throwing forbidden error when not authorized', async () => {
      const operation = 'create';
      const username = Symbol();
      const type = 'foo';
      const args = {
        foo: Symbol(),
      };

      const checkPrivilegesImpl = jest.fn(async () => ({
        hasAllRequested: false,
        username,
        privileges: {
          [mockActions.savedObject.get(type, operation)]: false,
        },
      }));

      const {
        checkSavedObjectsPrivileges,
        mockAuditLogger,
        mockActions,
        mockErrors,
      } = createCheckSavedObjectsPrivileges(true, checkPrivilegesImpl);

      await expect(
        checkSavedObjectsPrivileges(type, operation, undefined, args)
      ).rejects.toThrowError(mockErrors.forbiddenError);

      expect(checkPrivilegesImpl).toHaveBeenCalledWith(DEFAULT_SPACE_ID, [
        mockActions.savedObject.get(type, operation),
      ]);

      expect(mockAuditLogger.savedObjectsAuthorizationSuccess).not.toHaveBeenCalled();
      expect(mockAuditLogger.savedObjectsAuthorizationFailure).toHaveBeenCalledWith(
        username,
        operation,
        [type],
        [mockActions.savedObject.get(type, operation)],
        args
      );
    });

    it('checks at the current space, using an undefined namespace, throwing general error when checkPrivileges.atSpace throws an error', async () => {
      const operation = 'create';
      const type = 'foo';
      const args = {
        foo: Symbol(),
      };

      const checkPrivilegesImpl = jest.fn(async () => {
        throw new Error('test');
      });

      const {
        checkSavedObjectsPrivileges,
        mockAuditLogger,
        mockActions,
        mockErrors,
      } = createCheckSavedObjectsPrivileges(true, checkPrivilegesImpl);

      await expect(
        checkSavedObjectsPrivileges(type, operation, undefined, args)
      ).rejects.toThrowError(mockErrors.generalError);

      expect(checkPrivilegesImpl).toHaveBeenCalledWith(DEFAULT_SPACE_ID, [
        mockActions.savedObject.get(type, operation),
      ]);

      expect(mockAuditLogger.savedObjectsAuthorizationSuccess).not.toHaveBeenCalled();
      expect(mockAuditLogger.savedObjectsAuthorizationFailure).not.toHaveBeenCalled();
    });

    it('checks at the current space, using an undefined namespace, resolving when authorized', async () => {
      const operation = 'create';
      const username = Symbol();
      const type = 'foo';
      const args = {
        foo: Symbol(),
      };

      const checkPrivilegesImpl = jest.fn(async () => ({
        hasAllRequested: true,
        username,
        privileges: {
          [mockActions.savedObject.get(type, operation)]: true,
        },
      }));

      const {
        checkSavedObjectsPrivileges,
        mockAuditLogger,
        mockActions,
      } = createCheckSavedObjectsPrivileges(true, checkPrivilegesImpl);

      await checkSavedObjectsPrivileges(type, operation, undefined, args);

      expect(checkPrivilegesImpl).toHaveBeenCalledWith(DEFAULT_SPACE_ID, [
        mockActions.savedObject.get(type, operation),
      ]);

      expect(mockAuditLogger.savedObjectsAuthorizationSuccess).toHaveBeenCalledWith(
        username,
        operation,
        [type],
        args
      );
      expect(mockAuditLogger.savedObjectsAuthorizationFailure).not.toHaveBeenCalled();
    });
  });

  describe('spaces enabled at the my-custom space', () => {
    it('checks at the current space, using the my-custom namespace, throwing forbidden error when not authorized', async () => {
      const operation = 'create';
      const username = Symbol();
      const type = 'foo';
      const args = {
        foo: Symbol(),
      };

      const checkPrivilegesImpl = jest.fn(async () => ({
        hasAllRequested: false,
        username,
        privileges: {
          [mockActions.savedObject.get(type, operation)]: false,
        },
      }));

      const {
        checkSavedObjectsPrivileges,
        mockAuditLogger,
        mockActions,
        mockErrors,
      } = createCheckSavedObjectsPrivileges(true, checkPrivilegesImpl);

      await expect(
        checkSavedObjectsPrivileges(type, operation, 'my-custom', args)
      ).rejects.toThrowError(mockErrors.forbiddenError);

      expect(checkPrivilegesImpl).toHaveBeenCalledWith('my-custom', [
        mockActions.savedObject.get(type, operation),
      ]);

      expect(mockAuditLogger.savedObjectsAuthorizationSuccess).not.toHaveBeenCalled();
      expect(mockAuditLogger.savedObjectsAuthorizationFailure).toHaveBeenCalledWith(
        username,
        operation,
        [type],
        [mockActions.savedObject.get(type, operation)],
        args
      );
    });

    it('checks at the current space, using the my-custom namespace, throwing general error when checkPrivileges.atSpace throws an error', async () => {
      const operation = 'create';
      const type = 'foo';
      const args = {
        foo: Symbol(),
      };

      const checkPrivilegesImpl = jest.fn(async () => {
        throw new Error('test');
      });

      const {
        checkSavedObjectsPrivileges,
        mockAuditLogger,
        mockActions,
        mockErrors,
      } = createCheckSavedObjectsPrivileges(true, checkPrivilegesImpl);

      await expect(
        checkSavedObjectsPrivileges(type, operation, 'my-custom', args)
      ).rejects.toThrowError(mockErrors.generalError);

      expect(checkPrivilegesImpl).toHaveBeenCalledWith('my-custom', [
        mockActions.savedObject.get(type, operation),
      ]);

      expect(mockAuditLogger.savedObjectsAuthorizationSuccess).not.toHaveBeenCalled();
      expect(mockAuditLogger.savedObjectsAuthorizationFailure).not.toHaveBeenCalled();
    });

    it('checks at the current space, using the my-custom namespace, resolving when authorized', async () => {
      const operation = 'create';
      const username = Symbol();
      const type = 'foo';
      const args = {
        foo: Symbol(),
      };

      const checkPrivilegesImpl = jest.fn(async () => ({
        hasAllRequested: true,
        username,
        privileges: {
          [mockActions.savedObject.get(type, operation)]: true,
        },
      }));

      const {
        checkSavedObjectsPrivileges,
        mockAuditLogger,
        mockActions,
      } = createCheckSavedObjectsPrivileges(true, checkPrivilegesImpl);

      await checkSavedObjectsPrivileges(type, operation, 'my-custom', args);

      expect(checkPrivilegesImpl).toHaveBeenCalledWith('my-custom', [
        mockActions.savedObject.get(type, operation),
      ]);

      expect(mockAuditLogger.savedObjectsAuthorizationSuccess).toHaveBeenCalledWith(
        username,
        operation,
        [type],
        args
      );
      expect(mockAuditLogger.savedObjectsAuthorizationFailure).not.toHaveBeenCalled();
    });
  });
});
