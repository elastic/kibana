/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { SecretService } from './secret_service';

describe('The Secret Secret Store', function TestSecretServiceObject() {
  const savedObjectsClient = {
    create: jest.fn(),
    errors: jest.fn(),
    bulkCreate: jest.fn(),
    bulkGet: jest.fn(),
    delete: jest.fn(),
    find: jest.fn(),
    get: jest.fn(),
    update: jest.fn(),
  };

  const subject = new SecretService(savedObjectsClient as any, 'testSecretType');

  it('should not expose the password field', () => {
    const field = 'password';
    const sameSubject: any = subject;
    expect(sameSubject[field]).toBeUndefined();
  });

  it('should hide values using the saved object client', async () => {
    const hideMe = { message: 'my secret message', anotherSecret: 'this is unhidden' };
    let insideJob: any = null;
    savedObjectsClient.create.mockImplementation((type: string, attributes: any, options?: any) => {
      insideJob = {
        id: options.id,
        type: 'testSecretType',
        attributes,
      };
      return insideJob;
    });

    const hidden = await subject.hideAttribute(hideMe, 'message');
    expect(savedObjectsClient.create).toHaveBeenCalledTimes(1);
    expect(savedObjectsClient.update).not.toHaveBeenCalled();
    expect(hidden).toBeDefined();
    expect(hidden.attributes.message).toBeUndefined();
    expect(hidden.attributes.secret).toBeDefined();
    expect(hidden.attributes.secret).not.toContain('my secret message');
    expect(hidden.attributes.anotherSecret).toBeUndefined();
    expect(subject);
  });

  it('should be able to unhide values from saved objects', async () => {
    expect.assertions(4);
    const hideMe = {
      message: 'my secret message',
      anotherSecret: 'this is unhidden',
      someOtherProp: 'check me',
    };
    let insideJob: any = null;
    savedObjectsClient.create.mockImplementation((type: string, attributes: any, options?: any) => {
      insideJob = {
        id: options.id,
        type: 'testSecretType',
        attributes,
      };
      return insideJob;
    });
    savedObjectsClient.get.mockImplementation((type: string, id: string, options?: any) => {
      return insideJob;
    });
    const hidden = await subject.hideAttribute(hideMe, 'message');
    const unhidden = await subject.unhideAttribute(hidden.id);
    expect(unhidden.id).toEqual(hidden.id);
    expect(unhidden.type).toEqual(hidden.type);
    expect(unhidden.version).toEqual(hidden.version);
    expect(unhidden.attributes).toMatchObject(hideMe);
  });

  it('should be unable to unhide values if the saved object was changed in any way', async () => {
    expect.assertions(1);
    const hideMe = {
      message: 'my secret message',
      anotherSecret: 'this is unhidden',
      someOtherProp: 'check me',
    };
    let insideJob: any = null;
    let internalSavedObject: any = null;
    savedObjectsClient.create.mockImplementation((type: string, attributes: any, options?: any) => {
      insideJob = {
        id: 'testId',
        type: 'testSecretType',
        attributes,
      };
      return insideJob;
    });
    savedObjectsClient.update.mockImplementation(
      (type: string, id: string, attributes: any, options?: any) => {
        return (internalSavedObject = {
          id,
          type,
          attributes: {
            ...attributes,
            ...insideJob.attributes,
          },
        });
      }
    );
    savedObjectsClient.get.mockImplementation((type: string, id: string, options?: any) => {
      internalSavedObject.anotherSecret = 'I am changing the message';
      internalSavedObject.addNewField = 'me';
      return internalSavedObject;
    });
    const hidden = await subject.hideAttribute(hideMe, 'message');

    try {
      await subject.unhideAttribute(hidden.id);
      fail('The test fails because no exception was thrown');
    } catch (e) {
      expect(e).not.toBeNull();
    }
  });
});
