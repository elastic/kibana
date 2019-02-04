/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import * as sinon from 'sinon';
import { SecretStore } from './secret_store';

describe('The Secret Secret Store', function TestSecretStoreObject() {
  const savedObjectsClient = {
    create: sinon.stub(),
    errors: sinon.stub(),
    bulkCreate: sinon.stub(),
    bulkGet: sinon.stub(),
    delete: sinon.stub(),
    find: sinon.stub(),
    get: sinon.stub(),
    update: sinon.stub(),
  };

  const subject = new SecretStore(savedObjectsClient as any, 'testSecretType');

  it('should not expose the password field', () => {
    const field = 'password';
    const sameSubject: any = subject;
    expect(sameSubject[field]).toBeUndefined();
  });

  it('should hide values using the saved object client', async () => {
    const hideMe = { message: 'my secret message', nonSecret: 'this is unhidden' };
    let insideJob: any = null;
    savedObjectsClient.create.callsFake((type: string, attributes: any, options?: any) => {
      insideJob = {
        id: options.id,
        type: 'testSecretType',
        attributes,
      };
      return insideJob;
    });

    const hidden = await subject.hideAttribute(hideMe, 'message');
    sinon.assert.calledOnce(savedObjectsClient.create);
    expect(savedObjectsClient.update.notCalled).toBeTruthy();
    expect(hidden).toBeDefined();
    expect(hidden.attributes.message).toBeUndefined();
    expect(hidden.attributes.secret).toBeDefined();
    expect(hidden.attributes.secret).not.toContain('my secret message');
    expect(hidden.attributes.nonSecret).toBeUndefined();
    expect(subject);
  });

  it('should be able to unhide values from saved objects', async () => {
    expect.assertions(4);
    const hideMe = {
      message: 'my secret message',
      nonSecret: 'this is unhidden',
      someOtherProp: 'check me',
    };
    let insideJob: any = null;
    savedObjectsClient.create.callsFake((type: string, attributes: any, options?: any) => {
      insideJob = {
        id: options.id,
        type: 'testSecretType',
        attributes,
      };
      return insideJob;
    });
    savedObjectsClient.get.callsFake((type: string, id: string, options?: any) => {
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
      nonSecret: 'this is unhidden',
      someOtherProp: 'check me',
    };
    let insideJob: any = null;
    let internalSavedObject: any = null;
    savedObjectsClient.create.callsFake((type: string, attributes: any, options?: any) => {
      insideJob = {
        id: 'testId',
        type: 'testSecretType',
        attributes,
      };
      return insideJob;
    });
    savedObjectsClient.update.callsFake(
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
    savedObjectsClient.get.callsFake((type: string, id: string, options?: any) => {
      internalSavedObject.nonSecret = 'I am changing the message';
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
