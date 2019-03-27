/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import * as sinon from 'sinon';
import { SecretService } from './secret_service';
describe('The Secret Secret Store', async function TestSecretServiceObject() {
  const savedObjectsRepository = {
    create: jest.fn(),
    errors: {
      isConflictError: jest.fn(),
    },
    bulkCreate: jest.fn(),
    bulkGet: jest.fn(),
    delete: jest.fn(),
    find: jest.fn(),
    get: jest.fn(),
    update: jest.fn(),
  };

  const subject = new SecretService(
    savedObjectsRepository as any,
    'testSecretType',
    'my test encryption key'
  );

  it('should not expose the password field', () => {
    const field = 'password';
    const sameSubject: any = subject;
    expect(sameSubject[field]).toBeUndefined();
  });

  it('should hide values using the saved object client', async () => {
    const hideMe = { message: 'my secret message', nonSecret: 'this is unhidden' };
    let insideJob: any = null;
    savedObjectsRepository.create.mockImplementation(
      (type: string, attributes: any, options?: any) => {
        insideJob = {
          id: options.id,
          type: 'testSecretType',
          attributes,
        };
        return insideJob;
      }
    );

    const hidden = await subject.hideAttribute(hideMe);
    expect(savedObjectsRepository.create).toHaveBeenCalledTimes(1);
    expect(savedObjectsRepository.update).not.toHaveBeenCalled();
    expect(hidden).toBeDefined();
    expect(typeof hidden).toBe('string');
    expect(hidden).toMatch(/^[\w+\/]+/);
    expect(subject);
  });

  it('should be able to unhide values from saved objects', async () => {
    expect.assertions(3);
    const hideMe = {
      message: 'my secret message',
      nonSecret: 'this is unhidden',
      someOtherProp: 'check me',
    };
    let insideJob: any = null;
    savedObjectsRepository.create.mockImplementation(
      (type: string, attributes: any, options?: any) => {
        insideJob = {
          id: options.id,
          type: 'testSecretType',
          attributes,
        };
        return insideJob;
      }
    );
    savedObjectsRepository.get.mockImplementation((type: string, id: string, options?: any) => {
      return insideJob;
    });
    const hidden = await subject.hideAttribute(hideMe);
    const unhidden = await subject.unhideAttribute(hidden);
    expect(unhidden.id).toEqual(hidden);
    expect(unhidden.type).toEqual('testSecretType');
    expect(unhidden.attributes).toMatchObject(hideMe);
  });

  it('should be unable to unhide values if the saved object was changed in any way', async () => {
    expect.assertions(1);
    const hideMe = {
      message: 'my secret message',
      nonSecret: 'this is unhidden',
      someOtherProp: 'check me',
    };
    let insideJob: any = null;
    const internalSavedObject: any = null;
    savedObjectsRepository.create.mockImplementation(
      (type: string, attributes: any, options?: any) => {
        insideJob = {
          id: 'testId',
          type: 'testSecretType',
          attributes,
        };
        return insideJob;
      }
    );
    savedObjectsRepository.get.mockImplementation((type: string, id: string, options?: any) => {
      internalSavedObject.anotherSecret = 'I am changing the message';
      internalSavedObject.addNewField = 'me';
      return internalSavedObject;
    });
    const hidden = await subject.hideAttribute(hideMe);

    try {
      await subject.unhideAttribute(hidden);
      fail('The test fails because no exception was thrown');
    } catch (e) {
      expect(e).not.toBeNull();
    }
  });

  describe('encryption key validation', async () => {
    it('should be valid if first time use', async () => {
      let dummyObj: any;
      savedObjectsRepository.create.mockImplementation(
        (type: string, attributes: any, options?: any) => {
          dummyObj = {
            id: options.id,
            type,
            attributes,
          };
          return dummyObj;
        }
      );
      savedObjectsRepository.get.mockImplementation(
        (type: string, attributes: any, options?: any) => {
          return dummyObj;
        }
      );
      const isValid = await subject.validateKey();
      expect(isValid).toBeTruthy();
    });

    it('should return false if decrypt fails', async () => {
      let dummyObj: any;
      savedObjectsRepository.create.mockImplementation(
        (type: string, attributes: any, options?: any) => {
          attributes.secret = 'blah';
          dummyObj = {
            id: options.id,
            type,
            attributes,
          };
          return dummyObj;
        }
      );
      savedObjectsRepository.get.mockImplementation(
        (type: string, attributes: any, options?: any) => {
          return dummyObj;
        }
      );
      const isValid = await subject.validateKey();
      expect(isValid).toBeFalsy();
    });

    it('should return true if dummy already exists', async () => {
      let dummyObj: any;
      savedObjectsRepository.create.mockImplementation(
        (type: string, attributes: any, options?: any) => {
          attributes.secret = 'blah';
          dummyObj = {
            id: options.id,
            type,
            attributes,
          };
          throw new Error('test error');
        }
      );
      savedObjectsRepository.get.mockImplementation(
        (type: string, attributes: any, options?: any) => {
          return dummyObj;
        }
      );
      savedObjectsRepository.errors.isConflictError.mockReturnValue(true);
      const isValid = await subject.validateKey();
      expect(isValid).toBeFalsy();
    });

    it('should throw any error other than conflict', async () => {
      savedObjectsRepository.create.mockImplementation(
        (type: string, attributes: any, options?: any) => {
          throw new Error('test error');
        }
      );
      savedObjectsRepository.errors.isConflictError.mockReturnValue(false);
      await expect(subject.validateKey()).rejects.toThrow('test error');
    });
  });
});
