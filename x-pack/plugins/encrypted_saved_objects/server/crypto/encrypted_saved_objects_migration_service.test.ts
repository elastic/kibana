/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import nodeCrypto, { Crypto } from '@elastic/node-crypto';

import { EncryptedSavedObjectsMigrationService } from './encrypted_saved_objects_migration_service';
import { EncryptedSavedObjectAttributesDefinition } from './encrypted_saved_object_type_definition';
import { EncryptionError } from './encryption_error';
import { loggingSystemMock } from 'src/core/server/mocks';

let service: EncryptedSavedObjectsMigrationService;

const crypto = nodeCrypto({ encryptionKey: 'encryption-key-abc' });

const mockNodeCrypto: jest.Mocked<Crypto> = {
  encrypt: jest.fn(),
  decrypt: jest.fn(),
  encryptSync: jest.fn(),
  decryptSync: jest.fn(),
};

beforeEach(() => {
  service = new EncryptedSavedObjectsMigrationService(
    mockNodeCrypto,
    loggingSystemMock.create().get()
  );

  // Call actual `@elastic/node-crypto` by default, but allow to override implementation in tests.
  mockNodeCrypto.encryptSync.mockImplementation((input: any, aad?: string) =>
    crypto.encryptSync(input, aad)
  );
  mockNodeCrypto.decryptSync.mockImplementation((encryptedOutput: string | Buffer, aad?: string) =>
    crypto.decryptSync(encryptedOutput, aad)
  );
});

afterEach(() => {
  jest.resetAllMocks();
});

describe('#encryptAttributes', () => {
  beforeEach(() => {
    mockNodeCrypto.encryptSync.mockImplementation(
      (valueToEncrypt, aad) => `|${valueToEncrypt}|${aad}|`
    );

    service = new EncryptedSavedObjectsMigrationService(
      mockNodeCrypto,
      loggingSystemMock.create().get()
    );
  });

  it('does not encrypt attributes that are not supposed to be encrypted', () => {
    const attributes = { attrOne: 'one', attrTwo: 'two', attrThree: 'three' };
    const type = new EncryptedSavedObjectAttributesDefinition({
      type: 'known-type-1',
      attributesToEncrypt: new Set(['attrFour']),
    });
    expect(
      service.encryptAttributes({ type: 'known-type-1', id: 'object-id' }, type, attributes)
    ).toEqual({
      attrOne: 'one',
      attrTwo: 'two',
      attrThree: 'three',
    });
  });

  it('encrypts only attributes that are supposed to be encrypted', () => {
    const attributes = { attrOne: 'one', attrTwo: 'two', attrThree: 'three', attrFour: null };
    const type = new EncryptedSavedObjectAttributesDefinition({
      type: 'known-type-1',
      attributesToEncrypt: new Set(['attrOne', 'attrThree', 'attrFour']),
    });

    expect(
      service.encryptAttributes({ type: 'known-type-1', id: 'object-id' }, type, attributes)
    ).toEqual({
      attrOne: '|one|["known-type-1","object-id",{"attrTwo":"two"}]|',
      attrTwo: 'two',
      attrThree: '|three|["known-type-1","object-id",{"attrTwo":"two"}]|',
      attrFour: null,
    });
  });

  it('encrypts only attributes that are supposed to be encrypted even if not all provided', () => {
    const attributes = { attrTwo: 'two', attrThree: 'three' };

    const type = new EncryptedSavedObjectAttributesDefinition({
      type: 'known-type-1',
      attributesToEncrypt: new Set(['attrOne', 'attrThree']),
    });

    expect(
      service.encryptAttributes({ type: 'known-type-1', id: 'object-id' }, type, attributes)
    ).toEqual({
      attrTwo: 'two',
      attrThree: '|three|["known-type-1","object-id",{"attrTwo":"two"}]|',
    });
  });

  it('includes `namespace` into AAD if provided', () => {
    const attributes = { attrTwo: 'two', attrThree: 'three' };

    const type = new EncryptedSavedObjectAttributesDefinition({
      type: 'known-type-1',
      attributesToEncrypt: new Set(['attrOne', 'attrThree']),
    });

    expect(
      service.encryptAttributes(
        { type: 'known-type-1', id: 'object-id', namespace: 'object-ns' },
        type,
        attributes
      )
    ).toEqual({
      attrTwo: 'two',
      attrThree: '|three|["object-ns","known-type-1","object-id",{"attrTwo":"two"}]|',
    });
  });

  it('does not include specified attributes to AAD', () => {
    const knownType1attributes = { attrOne: 'one', attrTwo: 'two', attrThree: 'three' };
    const type1 = new EncryptedSavedObjectAttributesDefinition({
      type: 'known-type-1',
      attributesToEncrypt: new Set(['attrThree']),
    });

    const knownType2attributes = { attrOne: 'one', attrTwo: 'two', attrThree: 'three' };
    const type2 = new EncryptedSavedObjectAttributesDefinition({
      type: 'known-type-2',
      attributesToEncrypt: new Set(['attrThree']),
      attributesToExcludeFromAAD: new Set(['attrTwo']),
    });

    expect(
      service.encryptAttributes(
        { type: 'known-type-1', id: 'object-id-1' },
        type1,
        knownType1attributes
      )
    ).toEqual({
      attrOne: 'one',
      attrTwo: 'two',
      attrThree: '|three|["known-type-1","object-id-1",{"attrOne":"one","attrTwo":"two"}]|',
    });
    expect(
      service.encryptAttributes(
        { type: 'known-type-2', id: 'object-id-2' },
        type2,
        knownType2attributes
      )
    ).toEqual({
      attrOne: 'one',
      attrTwo: 'two',
      attrThree: '|three|["known-type-2","object-id-2",{"attrOne":"one"}]|',
    });
  });

  it('encrypts even if no attributes are included into AAD', () => {
    const attributes = { attrOne: 'one', attrThree: 'three' };
    const type = new EncryptedSavedObjectAttributesDefinition({
      type: 'known-type-1',
      attributesToEncrypt: new Set(['attrOne', 'attrThree']),
    });

    expect(
      service.encryptAttributes({ type: 'known-type-1', id: 'object-id-1' }, type, attributes)
    ).toEqual({
      attrOne: '|one|["known-type-1","object-id-1",{}]|',
      attrThree: '|three|["known-type-1","object-id-1",{}]|',
    });
  });

  it('fails if encryption of any attribute fails', () => {
    const attributes = { attrOne: 'one', attrTwo: 'two', attrThree: 'three' };
    const type = new EncryptedSavedObjectAttributesDefinition({
      type: 'known-type-1',
      attributesToEncrypt: new Set(['attrOne', 'attrThree']),
    });

    mockNodeCrypto.encryptSync
      .mockImplementationOnce(() => 'Successfully encrypted attrOne')
      .mockImplementationOnce(() => {
        throw new Error('Something went wrong with attrThree...');
      });

    expect(() =>
      service.encryptAttributes({ type: 'known-type-1', id: 'object-id' }, type, attributes)
    ).toThrowError(EncryptionError);

    expect(attributes).toEqual({
      attrOne: 'one',
      attrTwo: 'two',
      attrThree: 'three',
    });
  });
});

describe('#decryptAttributes', () => {
  it('does not decrypt attributes that are not supposed to be decrypted', () => {
    const attributes = { attrOne: 'one', attrTwo: 'two', attrThree: 'three' };

    const type = new EncryptedSavedObjectAttributesDefinition({
      type: 'known-type-1',
      attributesToEncrypt: new Set(['attrFour']),
    });

    expect(
      service.decryptAttributes({ type: 'known-type-1', id: 'object-id' }, type, attributes)
    ).toEqual({
      attrOne: 'one',
      attrTwo: 'two',
      attrThree: 'three',
    });
  });

  it('decrypts only attributes that are supposed to be decrypted', () => {
    const attributes = { attrOne: 'one', attrTwo: 'two', attrThree: 'three', attrFour: null };

    const type = new EncryptedSavedObjectAttributesDefinition({
      type: 'known-type-1',
      attributesToEncrypt: new Set(['attrOne', 'attrThree', 'attrFour']),
    });

    const encryptedAttributes = service.encryptAttributes(
      { type: 'known-type-1', id: 'object-id' },
      type,
      attributes
    );
    expect(encryptedAttributes).toEqual({
      attrOne: expect.not.stringMatching(/^one$/),
      attrTwo: 'two',
      attrThree: expect.not.stringMatching(/^three$/),
      attrFour: null,
    });

    expect(
      service.decryptAttributes(
        { type: 'known-type-1', id: 'object-id' },
        type,
        encryptedAttributes
      )
    ).toEqual({
      attrOne: 'one',
      attrTwo: 'two',
      attrThree: 'three',
      attrFour: null,
    });
  });

  it('decrypts only attributes that are supposed to be encrypted even if not all provided', () => {
    const attributes = { attrTwo: 'two', attrThree: 'three' };

    const type = new EncryptedSavedObjectAttributesDefinition({
      type: 'known-type-1',
      attributesToEncrypt: new Set(['attrOne', 'attrThree']),
    });

    const encryptedAttributes = service.encryptAttributes(
      { type: 'known-type-1', id: 'object-id' },
      type,
      attributes
    );
    expect(encryptedAttributes).toEqual({
      attrTwo: 'two',
      attrThree: expect.not.stringMatching(/^three$/),
    });

    expect(
      service.decryptAttributes(
        { type: 'known-type-1', id: 'object-id' },
        type,
        encryptedAttributes
      )
    ).toEqual({
      attrTwo: 'two',
      attrThree: 'three',
    });
  });

  it('decrypts if all attributes that contribute to AAD are present', () => {
    const attributes = { attrOne: 'one', attrTwo: 'two', attrThree: 'three' };

    const type = new EncryptedSavedObjectAttributesDefinition({
      type: 'known-type-1',
      attributesToEncrypt: new Set(['attrThree']),
      attributesToExcludeFromAAD: new Set(['attrOne']),
    });

    const encryptedAttributes = service.encryptAttributes(
      { type: 'known-type-1', id: 'object-id' },
      type,
      attributes
    );
    expect(encryptedAttributes).toEqual({
      attrOne: 'one',
      attrTwo: 'two',
      attrThree: expect.not.stringMatching(/^three$/),
    });

    const attributesWithoutAttr = { attrTwo: 'two', attrThree: encryptedAttributes.attrThree };

    expect(
      service.decryptAttributes(
        { type: 'known-type-1', id: 'object-id' },
        type,
        attributesWithoutAttr
      )
    ).toEqual({
      attrTwo: 'two',
      attrThree: 'three',
    });
  });

  it('decrypts even if attributes in AAD are defined in a different order', () => {
    const attributes = { attrOne: 'one', attrTwo: 'two', attrThree: 'three' };

    const type = new EncryptedSavedObjectAttributesDefinition({
      type: 'known-type-1',
      attributesToEncrypt: new Set(['attrThree']),
    });

    const encryptedAttributes = service.encryptAttributes(
      { type: 'known-type-1', id: 'object-id' },
      type,
      attributes
    );
    expect(encryptedAttributes).toEqual({
      attrOne: 'one',
      attrTwo: 'two',
      attrThree: expect.not.stringMatching(/^three$/),
    });

    const attributesInDifferentOrder = {
      attrThree: encryptedAttributes.attrThree,
      attrTwo: 'two',
      attrOne: 'one',
    };

    expect(
      service.decryptAttributes(
        { type: 'known-type-1', id: 'object-id' },
        type,
        attributesInDifferentOrder
      )
    ).toEqual({
      attrOne: 'one',
      attrTwo: 'two',
      attrThree: 'three',
    });
  });

  it('decrypts if correct namespace is provided', () => {
    const attributes = { attrOne: 'one', attrTwo: 'two', attrThree: 'three' };

    const type = new EncryptedSavedObjectAttributesDefinition({
      type: 'known-type-1',
      attributesToEncrypt: new Set(['attrThree']),
    });

    const encryptedAttributes = service.encryptAttributes(
      { type: 'known-type-1', id: 'object-id', namespace: 'object-ns' },
      type,
      attributes
    );
    expect(encryptedAttributes).toEqual({
      attrOne: 'one',
      attrTwo: 'two',
      attrThree: expect.not.stringMatching(/^three$/),
    });

    expect(
      service.decryptAttributes(
        { type: 'known-type-1', id: 'object-id', namespace: 'object-ns' },
        type,
        encryptedAttributes
      )
    ).toEqual({
      attrOne: 'one',
      attrTwo: 'two',
      attrThree: 'three',
    });
  });

  it('decrypts even if no attributes are included into AAD', () => {
    const attributes = { attrOne: 'one', attrThree: 'three' };
    const type = new EncryptedSavedObjectAttributesDefinition({
      type: 'known-type-1',
      attributesToEncrypt: new Set(['attrOne', 'attrThree']),
    });

    const encryptedAttributes = service.encryptAttributes(
      { type: 'known-type-1', id: 'object-id' },
      type,
      attributes
    );
    expect(encryptedAttributes).toEqual({
      attrOne: expect.not.stringMatching(/^one$/),
      attrThree: expect.not.stringMatching(/^three$/),
    });

    expect(
      service.decryptAttributes(
        { type: 'known-type-1', id: 'object-id' },
        type,
        encryptedAttributes
      )
    ).toEqual({
      attrOne: 'one',
      attrThree: 'three',
    });
  });

  it('decrypts non-string attributes and restores their original type', () => {
    const attributes = {
      attrOne: 'one',
      attrTwo: 'two',
      attrThree: 'three',
      attrFour: null,
      attrFive: { nested: 'five' },
      attrSix: 6,
    };

    const type = new EncryptedSavedObjectAttributesDefinition({
      type: 'known-type-1',
      attributesToEncrypt: new Set(['attrOne', 'attrThree', 'attrFour', 'attrFive', 'attrSix']),
    });

    const encryptedAttributes = service.encryptAttributes(
      { type: 'known-type-1', id: 'object-id' },
      type,
      attributes
    );
    expect(encryptedAttributes).toEqual({
      attrOne: expect.not.stringMatching(/^one$/),
      attrTwo: 'two',
      attrThree: expect.not.stringMatching(/^three$/),
      attrFour: null,
      attrFive: expect.any(String),
      attrSix: expect.any(String),
    });

    expect(
      service.decryptAttributes(
        { type: 'known-type-1', id: 'object-id' },
        type,
        encryptedAttributes
      )
    ).toEqual({
      attrOne: 'one',
      attrTwo: 'two',
      attrThree: 'three',
      attrFour: null,
      attrFive: { nested: 'five' },
      attrSix: 6,
    });
  });

  describe('decryption failures', () => {
    let encryptedAttributes: Record<string, string>;

    const type1 = new EncryptedSavedObjectAttributesDefinition({
      type: 'known-type-1',
      attributesToEncrypt: new Set(['attrThree']),
    });

    const type2 = new EncryptedSavedObjectAttributesDefinition({
      type: 'known-type-2',
      attributesToEncrypt: new Set(['attrThree']),
    });

    beforeEach(() => {
      const attributes = { attrOne: 'one', attrTwo: 'two', attrThree: 'three' };

      encryptedAttributes = service.encryptAttributes(
        { type: 'known-type-1', id: 'object-id' },
        type1,
        attributes
      );
    });

    it('fails to decrypt if not all attributes that contribute to AAD are present', () => {
      const attributesWithoutAttr = { attrTwo: 'two', attrThree: encryptedAttributes.attrThree };
      expect(() =>
        service.decryptAttributes(
          { type: 'known-type-1', id: 'object-id' },
          type1,
          attributesWithoutAttr
        )
      ).toThrowError(EncryptionError);
    });

    it('fails to decrypt if ID does not match', () => {
      expect(() =>
        service.decryptAttributes(
          { type: 'known-type-1', id: 'object-id*' },
          type1,
          encryptedAttributes
        )
      ).toThrowError(EncryptionError);
    });

    it('fails to decrypt if type does not match', () => {
      expect(() =>
        service.decryptAttributes(
          { type: 'known-type-2', id: 'object-id' },
          type2,
          encryptedAttributes
        )
      ).toThrowError(EncryptionError);
    });

    it('fails to decrypt if namespace does not match', () => {
      encryptedAttributes = service.encryptAttributes(
        { type: 'known-type-1', id: 'object-id', namespace: 'object-ns' },
        type1,
        { attrOne: 'one', attrTwo: 'two', attrThree: 'three' }
      );

      expect(() =>
        service.decryptAttributes(
          { type: 'known-type-1', id: 'object-id', namespace: 'object-NS' },
          type1,
          encryptedAttributes
        )
      ).toThrowError(EncryptionError);
    });

    it('fails to decrypt if namespace is expected, but is not provided', () => {
      encryptedAttributes = service.encryptAttributes(
        { type: 'known-type-1', id: 'object-id', namespace: 'object-ns' },
        type1,
        { attrOne: 'one', attrTwo: 'two', attrThree: 'three' }
      );

      expect(() =>
        service.decryptAttributes(
          { type: 'known-type-1', id: 'object-id' },
          type1,
          encryptedAttributes
        )
      ).toThrowError(EncryptionError);
    });

    it('fails to decrypt if encrypted attribute is defined, but not a string', () => {
      expect(() =>
        service.decryptAttributes({ type: 'known-type-1', id: 'object-id' }, type1, {
          ...encryptedAttributes,
          attrThree: 2,
        })
      ).toThrowError('Encrypted "attrThree" attribute should be a string, but found number');
    });

    it('fails to decrypt if encrypted attribute is not correct', () => {
      expect(() =>
        service.decryptAttributes({ type: 'known-type-1', id: 'object-id' }, type1, {
          ...encryptedAttributes,
          attrThree: 'some-unknown-string',
        })
      ).toThrowError(EncryptionError);
    });

    it('fails to decrypt if the AAD attribute has changed', () => {
      expect(() =>
        service.decryptAttributes({ type: 'known-type-1', id: 'object-id' }, type1, {
          ...encryptedAttributes,
          attrOne: 'oNe',
        })
      ).toThrowError(EncryptionError);
    });

    it('fails if encrypted with another encryption key', () => {
      service = new EncryptedSavedObjectsMigrationService(
        nodeCrypto({ encryptionKey: 'encryption-key-abc*' }),
        loggingSystemMock.create().get()
      );

      const type = new EncryptedSavedObjectAttributesDefinition({
        type: 'known-type-1',
        attributesToEncrypt: new Set(['attrThree']),
      });

      expect(() =>
        service.decryptAttributes(
          { type: 'known-type-1', id: 'object-id' },
          type,
          encryptedAttributes
        )
      ).toThrowError(EncryptionError);
    });
  });
});
