/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import nodeCrypto, { Crypto } from '@elastic/node-crypto';

import { mockAuthenticatedUser } from '../../../security/common/model/authenticated_user.mock';
import { EncryptedSavedObjectsAuditLogger } from '../audit';
import { EncryptedSavedObjectsService } from './encrypted_saved_objects_service';
import { EncryptionError } from './encryption_error';

import { loggingSystemMock } from 'src/core/server/mocks';
import { encryptedSavedObjectsAuditLoggerMock } from '../audit/index.mock';

const crypto = nodeCrypto({ encryptionKey: 'encryption-key-abc' });

const mockNodeCrypto: jest.Mocked<Crypto> = {
  encrypt: jest.fn(),
  decrypt: jest.fn(),
  encryptSync: jest.fn(),
  decryptSync: jest.fn(),
};

let service: EncryptedSavedObjectsService;
let mockAuditLogger: jest.Mocked<EncryptedSavedObjectsAuditLogger>;

beforeEach(() => {
  // Call actual `@elastic/node-crypto` by default, but allow to override implementation in tests.
  mockNodeCrypto.encrypt.mockImplementation(async (input: any, aad?: string) =>
    crypto.encrypt(input, aad)
  );
  mockNodeCrypto.decrypt.mockImplementation(
    async (encryptedOutput: string | Buffer, aad?: string) => crypto.decrypt(encryptedOutput, aad)
  );
  mockNodeCrypto.encryptSync.mockImplementation((input: any, aad?: string) =>
    crypto.encryptSync(input, aad)
  );
  mockNodeCrypto.decryptSync.mockImplementation((encryptedOutput: string | Buffer, aad?: string) =>
    crypto.decryptSync(encryptedOutput, aad)
  );

  mockAuditLogger = encryptedSavedObjectsAuditLoggerMock.create();

  service = new EncryptedSavedObjectsService(
    mockNodeCrypto,
    loggingSystemMock.create().get(),
    mockAuditLogger
  );
});

afterEach(() => jest.resetAllMocks());

describe('#registerType', () => {
  it('throws if `attributesToEncrypt` is empty', () => {
    expect(() =>
      service.registerType({ type: 'known-type-1', attributesToEncrypt: new Set() })
    ).toThrowError('The "attributesToEncrypt" array for "known-type-1" is empty.');
  });

  it('throws if `type` has been registered already', () => {
    service.registerType({ type: 'known-type-1', attributesToEncrypt: new Set(['attr']) });
    expect(() =>
      service.registerType({ type: 'known-type-1', attributesToEncrypt: new Set(['attr']) })
    ).toThrowError('The "known-type-1" saved object type is already registered.');
  });
});

describe('#isRegistered', () => {
  it('correctly determines whether the specified type is registered', () => {
    expect(service.isRegistered('known-type-1')).toBe(false);
    expect(service.isRegistered('known-type-2')).toBe(false);
    expect(service.isRegistered('unknown-type')).toBe(false);

    service.registerType({ type: 'known-type-1', attributesToEncrypt: new Set(['attr-1']) });
    expect(service.isRegistered('known-type-1')).toBe(true);
    expect(service.isRegistered('known-type-2')).toBe(false);
    expect(service.isRegistered('unknown-type')).toBe(false);

    service.registerType({ type: 'known-type-2', attributesToEncrypt: new Set(['attr-2']) });
    expect(service.isRegistered('known-type-1')).toBe(true);
    expect(service.isRegistered('known-type-2')).toBe(true);
    expect(service.isRegistered('unknown-type')).toBe(false);
  });
});

describe('#stripOrDecryptAttributes', () => {
  it('does not strip attributes from unknown types', async () => {
    const attributes = { attrOne: 'one', attrTwo: 'two', attrThree: 'three' };

    await expect(
      service.stripOrDecryptAttributes({ id: 'unknown-id', type: 'unknown-type' }, attributes)
    ).resolves.toEqual({ attributes: { attrOne: 'one', attrTwo: 'two', attrThree: 'three' } });
  });

  it('does not strip any attributes if none of them are supposed to be encrypted', async () => {
    const attributes = { attrOne: 'one', attrTwo: 'two', attrThree: 'three' };

    service.registerType({ type: 'known-type-1', attributesToEncrypt: new Set(['attrFour']) });

    await expect(
      service.stripOrDecryptAttributes({ id: 'known-id', type: 'known-type-1' }, attributes)
    ).resolves.toEqual({ attributes: { attrOne: 'one', attrTwo: 'two', attrThree: 'three' } });
  });

  it('strips only attributes that are supposed to be encrypted', async () => {
    const attributes = { attrOne: 'one', attrTwo: 'two', attrThree: 'three' };

    service.registerType({
      type: 'known-type-1',
      attributesToEncrypt: new Set(['attrOne', 'attrThree']),
    });

    await expect(
      service.stripOrDecryptAttributes({ id: 'known-id', type: 'known-type-1' }, attributes)
    ).resolves.toEqual({ attributes: { attrTwo: 'two' } });
  });

  describe('with `dangerouslyExposeValue`', () => {
    it('decrypts and exposes values with `dangerouslyExposeValue` set to `true`', async () => {
      service.registerType({
        type: 'known-type-1',
        attributesToEncrypt: new Set([
          'attrOne',
          { key: 'attrThree', dangerouslyExposeValue: true },
        ]),
      });

      const attributes = { attrOne: 'one', attrTwo: 'two', attrThree: 'three' };
      const encryptedAttributes = await service.encryptAttributes(
        { type: 'known-type-1', id: 'object-id' },
        attributes
      );

      const mockUser = mockAuthenticatedUser();
      await expect(
        service.stripOrDecryptAttributes(
          { type: 'known-type-1', id: 'object-id' },
          encryptedAttributes,
          undefined,
          { user: mockUser }
        )
      ).resolves.toEqual({ attributes: { attrTwo: 'two', attrThree: 'three' } });

      expect(mockAuditLogger.decryptAttributesSuccess).toHaveBeenCalledTimes(1);
      expect(mockAuditLogger.decryptAttributesSuccess).toHaveBeenCalledWith(
        ['attrThree'],
        { type: 'known-type-1', id: 'object-id' },
        mockUser
      );
    });

    it('exposes values with `dangerouslyExposeValue` set to `true` using original attributes if provided', async () => {
      service.registerType({
        type: 'known-type-1',
        attributesToEncrypt: new Set([
          'attrOne',
          { key: 'attrThree', dangerouslyExposeValue: true },
        ]),
      });

      const attributes = { attrOne: 'one', attrTwo: 'two', attrThree: 'three' };
      const encryptedAttributes = {
        attrOne: 'fake-enc-one',
        attrTwo: 'two',
        attrThree: 'fake-enc-three',
      };

      await expect(
        service.stripOrDecryptAttributes(
          { type: 'known-type-1', id: 'object-id' },
          encryptedAttributes,
          attributes
        )
      ).resolves.toEqual({ attributes: { attrTwo: 'two', attrThree: 'three' } });

      expect(mockAuditLogger.decryptAttributesSuccess).not.toHaveBeenCalled();
      expect(mockAuditLogger.decryptAttributeFailure).not.toHaveBeenCalled();
    });

    it('strips attributes with `dangerouslyExposeValue` set to `true` if failed to decrypt', async () => {
      service.registerType({
        type: 'known-type-1',
        attributesToEncrypt: new Set([
          'attrOne',
          { key: 'attrThree', dangerouslyExposeValue: true },
        ]),
      });

      const attributes = {
        attrZero: 'zero',
        attrOne: 'one',
        attrTwo: 'two',
        attrThree: 'three',
        attrFour: 'four',
      };
      const encryptedAttributes = await service.encryptAttributes(
        { type: 'known-type-1', id: 'object-id' },
        attributes
      );

      encryptedAttributes.attrThree = 'some-undecryptable-value';

      const mockUser = mockAuthenticatedUser();
      const { attributes: decryptedAttributes, error } = await service.stripOrDecryptAttributes(
        { type: 'known-type-1', id: 'object-id' },
        encryptedAttributes,
        undefined,
        { user: mockUser }
      );

      expect(decryptedAttributes).toEqual({ attrZero: 'zero', attrTwo: 'two', attrFour: 'four' });
      expect(error).toMatchInlineSnapshot(`[Error: Unable to decrypt attribute "attrThree"]`);

      expect(mockAuditLogger.decryptAttributesSuccess).not.toHaveBeenCalled();
      expect(mockAuditLogger.decryptAttributeFailure).toHaveBeenCalledWith(
        'attrThree',
        { type: 'known-type-1', id: 'object-id' },
        mockUser
      );
    });
  });
});

describe('#encryptAttributes', () => {
  beforeEach(() => {
    mockNodeCrypto.encrypt.mockImplementation(
      async (valueToEncrypt, aad) => `|${valueToEncrypt}|${aad}|`
    );

    service = new EncryptedSavedObjectsService(
      mockNodeCrypto,
      loggingSystemMock.create().get(),
      mockAuditLogger
    );
  });

  it('does not encrypt attributes for unknown types', async () => {
    const attributes = { attrOne: 'one', attrTwo: 'two', attrThree: 'three' };

    await expect(
      service.encryptAttributes({ type: 'unknown-type', id: 'object-id' }, attributes)
    ).resolves.toEqual({
      attrOne: 'one',
      attrTwo: 'two',
      attrThree: 'three',
    });
    expect(mockAuditLogger.encryptAttributesSuccess).not.toHaveBeenCalled();
  });

  it('does not encrypt attributes for known, but not registered types', async () => {
    const attributes = { attrOne: 'one', attrTwo: 'two', attrThree: 'three' };

    await expect(
      service.encryptAttributes({ type: 'known-type-1', id: 'object-id' }, attributes)
    ).resolves.toEqual({
      attrOne: 'one',
      attrTwo: 'two',
      attrThree: 'three',
    });
    expect(mockAuditLogger.encryptAttributesSuccess).not.toHaveBeenCalled();
  });

  it('does not encrypt attributes that are not supposed to be encrypted', async () => {
    const attributes = { attrOne: 'one', attrTwo: 'two', attrThree: 'three' };

    service.registerType({ type: 'known-type-1', attributesToEncrypt: new Set(['attrFour']) });

    await expect(
      service.encryptAttributes({ type: 'known-type-1', id: 'object-id' }, attributes)
    ).resolves.toEqual({
      attrOne: 'one',
      attrTwo: 'two',
      attrThree: 'three',
    });
    expect(mockAuditLogger.encryptAttributesSuccess).not.toHaveBeenCalled();
  });

  it('encrypts only attributes that are supposed to be encrypted', async () => {
    const attributes = { attrOne: 'one', attrTwo: 'two', attrThree: 'three', attrFour: null };

    service.registerType({
      type: 'known-type-1',
      attributesToEncrypt: new Set(['attrOne', 'attrThree', 'attrFour']),
    });

    const mockUser = mockAuthenticatedUser();
    await expect(
      service.encryptAttributes({ type: 'known-type-1', id: 'object-id' }, attributes, {
        user: mockUser,
      })
    ).resolves.toEqual({
      attrOne: '|one|["known-type-1","object-id",{"attrTwo":"two"}]|',
      attrTwo: 'two',
      attrThree: '|three|["known-type-1","object-id",{"attrTwo":"two"}]|',
      attrFour: null,
    });
    expect(mockAuditLogger.encryptAttributesSuccess).toHaveBeenCalledTimes(1);
    expect(mockAuditLogger.encryptAttributesSuccess).toHaveBeenCalledWith(
      ['attrOne', 'attrThree'],
      { type: 'known-type-1', id: 'object-id' },
      mockUser
    );
  });

  it('encrypts only attributes that are supposed to be encrypted even if not all provided', async () => {
    const attributes = { attrTwo: 'two', attrThree: 'three' };

    service.registerType({
      type: 'known-type-1',
      attributesToEncrypt: new Set(['attrOne', 'attrThree']),
    });

    const mockUser = mockAuthenticatedUser();
    await expect(
      service.encryptAttributes({ type: 'known-type-1', id: 'object-id' }, attributes, {
        user: mockUser,
      })
    ).resolves.toEqual({
      attrTwo: 'two',
      attrThree: '|three|["known-type-1","object-id",{"attrTwo":"two"}]|',
    });
    expect(mockAuditLogger.encryptAttributesSuccess).toHaveBeenCalledTimes(1);
    expect(mockAuditLogger.encryptAttributesSuccess).toHaveBeenCalledWith(
      ['attrThree'],
      { type: 'known-type-1', id: 'object-id' },
      mockUser
    );
  });

  it('includes `namespace` into AAD if provided', async () => {
    const attributes = { attrTwo: 'two', attrThree: 'three' };

    service.registerType({
      type: 'known-type-1',
      attributesToEncrypt: new Set(['attrOne', 'attrThree']),
    });

    const mockUser = mockAuthenticatedUser();
    await expect(
      service.encryptAttributes(
        { type: 'known-type-1', id: 'object-id', namespace: 'object-ns' },
        attributes,
        { user: mockUser }
      )
    ).resolves.toEqual({
      attrTwo: 'two',
      attrThree: '|three|["object-ns","known-type-1","object-id",{"attrTwo":"two"}]|',
    });
    expect(mockAuditLogger.encryptAttributesSuccess).toHaveBeenCalledTimes(1);
    expect(mockAuditLogger.encryptAttributesSuccess).toHaveBeenCalledWith(
      ['attrThree'],
      { type: 'known-type-1', id: 'object-id', namespace: 'object-ns' },
      mockUser
    );
  });

  it('does not include specified attributes to AAD', async () => {
    const knownType1attributes = { attrOne: 'one', attrTwo: 'two', attrThree: 'three' };
    service.registerType({
      type: 'known-type-1',
      attributesToEncrypt: new Set(['attrThree']),
    });

    const knownType2attributes = { attrOne: 'one', attrTwo: 'two', attrThree: 'three' };
    service.registerType({
      type: 'known-type-2',
      attributesToEncrypt: new Set(['attrThree']),
      attributesToExcludeFromAAD: new Set(['attrTwo']),
    });

    await expect(
      service.encryptAttributes({ type: 'known-type-1', id: 'object-id-1' }, knownType1attributes)
    ).resolves.toEqual({
      attrOne: 'one',
      attrTwo: 'two',
      attrThree: '|three|["known-type-1","object-id-1",{"attrOne":"one","attrTwo":"two"}]|',
    });
    await expect(
      service.encryptAttributes({ type: 'known-type-2', id: 'object-id-2' }, knownType2attributes)
    ).resolves.toEqual({
      attrOne: 'one',
      attrTwo: 'two',
      attrThree: '|three|["known-type-2","object-id-2",{"attrOne":"one"}]|',
    });
  });

  it('encrypts even if no attributes are included into AAD', async () => {
    const attributes = { attrOne: 'one', attrThree: 'three' };
    service.registerType({
      type: 'known-type-1',
      attributesToEncrypt: new Set(['attrOne', 'attrThree']),
    });

    await expect(
      service.encryptAttributes({ type: 'known-type-1', id: 'object-id-1' }, attributes)
    ).resolves.toEqual({
      attrOne: '|one|["known-type-1","object-id-1",{}]|',
      attrThree: '|three|["known-type-1","object-id-1",{}]|',
    });
  });

  it('fails if encryption of any attribute fails', async () => {
    const attributes = { attrOne: 'one', attrTwo: 'two', attrThree: 'three' };
    service.registerType({
      type: 'known-type-1',
      attributesToEncrypt: new Set(['attrOne', 'attrThree']),
    });

    mockNodeCrypto.encrypt
      .mockResolvedValueOnce('Successfully encrypted attrOne')
      .mockRejectedValueOnce(new Error('Something went wrong with attrThree...'));

    const mockUser = mockAuthenticatedUser();
    await expect(
      service.encryptAttributes({ type: 'known-type-1', id: 'object-id' }, attributes, {
        user: mockUser,
      })
    ).rejects.toThrowError(EncryptionError);

    expect(attributes).toEqual({
      attrOne: 'one',
      attrTwo: 'two',
      attrThree: 'three',
    });
    expect(mockAuditLogger.encryptAttributesSuccess).not.toHaveBeenCalled();
    expect(mockAuditLogger.encryptAttributeFailure).toHaveBeenCalledTimes(1);
    expect(mockAuditLogger.encryptAttributeFailure).toHaveBeenCalledWith(
      'attrThree',
      { type: 'known-type-1', id: 'object-id' },
      mockUser
    );
  });
});

describe('#decryptAttributes', () => {
  it('does not decrypt attributes for unknown types', async () => {
    const attributes = { attrOne: 'one', attrTwo: 'two', attrThree: 'three' };

    await expect(
      service.decryptAttributes({ type: 'unknown-type', id: 'object-id' }, attributes)
    ).resolves.toEqual({
      attrOne: 'one',
      attrTwo: 'two',
      attrThree: 'three',
    });
    expect(mockAuditLogger.decryptAttributesSuccess).not.toHaveBeenCalled();
  });

  it('does not decrypt attributes for known, but not registered types', async () => {
    const attributes = { attrOne: 'one', attrTwo: 'two', attrThree: 'three' };

    await expect(
      service.decryptAttributes({ type: 'known-type-1', id: 'object-id' }, attributes)
    ).resolves.toEqual({
      attrOne: 'one',
      attrTwo: 'two',
      attrThree: 'three',
    });
    expect(mockAuditLogger.decryptAttributesSuccess).not.toHaveBeenCalled();
  });

  it('does not decrypt attributes that are not supposed to be decrypted', async () => {
    const attributes = { attrOne: 'one', attrTwo: 'two', attrThree: 'three' };

    service.registerType({ type: 'known-type-1', attributesToEncrypt: new Set(['attrFour']) });

    await expect(
      service.decryptAttributes({ type: 'known-type-1', id: 'object-id' }, attributes)
    ).resolves.toEqual({
      attrOne: 'one',
      attrTwo: 'two',
      attrThree: 'three',
    });
    expect(mockAuditLogger.decryptAttributesSuccess).not.toHaveBeenCalled();
  });

  it('decrypts only attributes that are supposed to be decrypted', async () => {
    const attributes = { attrOne: 'one', attrTwo: 'two', attrThree: 'three', attrFour: null };

    service.registerType({
      type: 'known-type-1',
      attributesToEncrypt: new Set(['attrOne', 'attrThree', 'attrFour']),
    });

    const encryptedAttributes = await service.encryptAttributes(
      { type: 'known-type-1', id: 'object-id' },
      attributes
    );
    expect(encryptedAttributes).toEqual({
      attrOne: expect.not.stringMatching(/^one$/),
      attrTwo: 'two',
      attrThree: expect.not.stringMatching(/^three$/),
      attrFour: null,
    });

    const mockUser = mockAuthenticatedUser();
    await expect(
      service.decryptAttributes({ type: 'known-type-1', id: 'object-id' }, encryptedAttributes, {
        user: mockUser,
      })
    ).resolves.toEqual({
      attrOne: 'one',
      attrTwo: 'two',
      attrThree: 'three',
      attrFour: null,
    });
    expect(mockAuditLogger.decryptAttributesSuccess).toHaveBeenCalledTimes(1);
    expect(mockAuditLogger.decryptAttributesSuccess).toHaveBeenCalledWith(
      ['attrOne', 'attrThree'],
      { type: 'known-type-1', id: 'object-id' },
      mockUser
    );
  });

  it('decrypts only attributes that are supposed to be encrypted even if not all provided', async () => {
    const attributes = { attrTwo: 'two', attrThree: 'three' };

    service.registerType({
      type: 'known-type-1',
      attributesToEncrypt: new Set(['attrOne', 'attrThree']),
    });

    const encryptedAttributes = await service.encryptAttributes(
      { type: 'known-type-1', id: 'object-id' },
      attributes
    );
    expect(encryptedAttributes).toEqual({
      attrTwo: 'two',
      attrThree: expect.not.stringMatching(/^three$/),
    });

    const mockUser = mockAuthenticatedUser();
    await expect(
      service.decryptAttributes({ type: 'known-type-1', id: 'object-id' }, encryptedAttributes, {
        user: mockUser,
      })
    ).resolves.toEqual({
      attrTwo: 'two',
      attrThree: 'three',
    });
    expect(mockAuditLogger.decryptAttributesSuccess).toHaveBeenCalledTimes(1);
    expect(mockAuditLogger.decryptAttributesSuccess).toHaveBeenCalledWith(
      ['attrThree'],
      { type: 'known-type-1', id: 'object-id' },
      mockUser
    );
  });

  it('decrypts if all attributes that contribute to AAD are present', async () => {
    const attributes = { attrOne: 'one', attrTwo: 'two', attrThree: 'three' };

    service.registerType({
      type: 'known-type-1',
      attributesToEncrypt: new Set(['attrThree']),
      attributesToExcludeFromAAD: new Set(['attrOne']),
    });

    const encryptedAttributes = await service.encryptAttributes(
      { type: 'known-type-1', id: 'object-id' },
      attributes
    );
    expect(encryptedAttributes).toEqual({
      attrOne: 'one',
      attrTwo: 'two',
      attrThree: expect.not.stringMatching(/^three$/),
    });

    const attributesWithoutAttr = { attrTwo: 'two', attrThree: encryptedAttributes.attrThree };

    const mockUser = mockAuthenticatedUser();
    await expect(
      service.decryptAttributes({ type: 'known-type-1', id: 'object-id' }, attributesWithoutAttr, {
        user: mockUser,
      })
    ).resolves.toEqual({
      attrTwo: 'two',
      attrThree: 'three',
    });
    expect(mockAuditLogger.decryptAttributesSuccess).toHaveBeenCalledTimes(1);
    expect(mockAuditLogger.decryptAttributesSuccess).toHaveBeenCalledWith(
      ['attrThree'],
      { type: 'known-type-1', id: 'object-id' },
      mockUser
    );
  });

  it('decrypts even if attributes in AAD are defined in a different order', async () => {
    const attributes = { attrOne: 'one', attrTwo: 'two', attrThree: 'three' };

    service.registerType({
      type: 'known-type-1',
      attributesToEncrypt: new Set(['attrThree']),
    });

    const encryptedAttributes = await service.encryptAttributes(
      { type: 'known-type-1', id: 'object-id' },
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

    const mockUser = mockAuthenticatedUser();
    await expect(
      service.decryptAttributes(
        { type: 'known-type-1', id: 'object-id' },
        attributesInDifferentOrder,
        { user: mockUser }
      )
    ).resolves.toEqual({
      attrOne: 'one',
      attrTwo: 'two',
      attrThree: 'three',
    });
    expect(mockAuditLogger.decryptAttributesSuccess).toHaveBeenCalledTimes(1);
    expect(mockAuditLogger.decryptAttributesSuccess).toHaveBeenCalledWith(
      ['attrThree'],
      { type: 'known-type-1', id: 'object-id' },
      mockUser
    );
  });

  it('decrypts if correct namespace is provided', async () => {
    const attributes = { attrOne: 'one', attrTwo: 'two', attrThree: 'three' };

    service.registerType({
      type: 'known-type-1',
      attributesToEncrypt: new Set(['attrThree']),
    });

    const encryptedAttributes = await service.encryptAttributes(
      { type: 'known-type-1', id: 'object-id', namespace: 'object-ns' },
      attributes
    );
    expect(encryptedAttributes).toEqual({
      attrOne: 'one',
      attrTwo: 'two',
      attrThree: expect.not.stringMatching(/^three$/),
    });

    const mockUser = mockAuthenticatedUser();
    await expect(
      service.decryptAttributes(
        { type: 'known-type-1', id: 'object-id', namespace: 'object-ns' },
        encryptedAttributes,
        { user: mockUser }
      )
    ).resolves.toEqual({
      attrOne: 'one',
      attrTwo: 'two',
      attrThree: 'three',
    });
    expect(mockAuditLogger.decryptAttributesSuccess).toHaveBeenCalledTimes(1);
    expect(mockAuditLogger.decryptAttributesSuccess).toHaveBeenCalledWith(
      ['attrThree'],
      { type: 'known-type-1', id: 'object-id', namespace: 'object-ns' },
      mockUser
    );
  });

  it('decrypts even if no attributes are included into AAD', async () => {
    const attributes = { attrOne: 'one', attrThree: 'three' };
    service.registerType({
      type: 'known-type-1',
      attributesToEncrypt: new Set(['attrOne', 'attrThree']),
    });

    const encryptedAttributes = await service.encryptAttributes(
      { type: 'known-type-1', id: 'object-id' },
      attributes
    );
    expect(encryptedAttributes).toEqual({
      attrOne: expect.not.stringMatching(/^one$/),
      attrThree: expect.not.stringMatching(/^three$/),
    });

    const mockUser = mockAuthenticatedUser();
    await expect(
      service.decryptAttributes({ type: 'known-type-1', id: 'object-id' }, encryptedAttributes, {
        user: mockUser,
      })
    ).resolves.toEqual({
      attrOne: 'one',
      attrThree: 'three',
    });
    expect(mockAuditLogger.decryptAttributesSuccess).toHaveBeenCalledTimes(1);
    expect(mockAuditLogger.decryptAttributesSuccess).toHaveBeenCalledWith(
      ['attrOne', 'attrThree'],
      { type: 'known-type-1', id: 'object-id' },
      mockUser
    );
  });

  it('decrypts non-string attributes and restores their original type', async () => {
    const attributes = {
      attrOne: 'one',
      attrTwo: 'two',
      attrThree: 'three',
      attrFour: null,
      attrFive: { nested: 'five' },
      attrSix: 6,
    };

    service.registerType({
      type: 'known-type-1',
      attributesToEncrypt: new Set(['attrOne', 'attrThree', 'attrFour', 'attrFive', 'attrSix']),
    });

    const encryptedAttributes = await service.encryptAttributes(
      { type: 'known-type-1', id: 'object-id' },
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

    const mockUser = mockAuthenticatedUser();
    await expect(
      service.decryptAttributes({ type: 'known-type-1', id: 'object-id' }, encryptedAttributes, {
        user: mockUser,
      })
    ).resolves.toEqual({
      attrOne: 'one',
      attrTwo: 'two',
      attrThree: 'three',
      attrFour: null,
      attrFive: { nested: 'five' },
      attrSix: 6,
    });
    expect(mockAuditLogger.decryptAttributesSuccess).toHaveBeenCalledTimes(1);
    expect(mockAuditLogger.decryptAttributesSuccess).toHaveBeenCalledWith(
      ['attrOne', 'attrThree', 'attrFive', 'attrSix'],
      { type: 'known-type-1', id: 'object-id' },
      mockUser
    );
  });

  describe('decryption failures', () => {
    let encryptedAttributes: Record<string, string>;
    beforeEach(async () => {
      const attributes = { attrOne: 'one', attrTwo: 'two', attrThree: 'three' };

      service.registerType({
        type: 'known-type-1',
        attributesToEncrypt: new Set(['attrThree']),
      });

      service.registerType({
        type: 'known-type-2',
        attributesToEncrypt: new Set(['attrThree']),
      });

      encryptedAttributes = await service.encryptAttributes(
        { type: 'known-type-1', id: 'object-id' },
        attributes
      );
    });

    it('fails to decrypt if not all attributes that contribute to AAD are present', async () => {
      const attributesWithoutAttr = { attrTwo: 'two', attrThree: encryptedAttributes.attrThree };
      const mockUser = mockAuthenticatedUser();
      await expect(
        service.decryptAttributes(
          { type: 'known-type-1', id: 'object-id' },
          attributesWithoutAttr,
          { user: mockUser }
        )
      ).rejects.toThrowError(EncryptionError);

      expect(mockAuditLogger.decryptAttributesSuccess).not.toHaveBeenCalled();
      expect(mockAuditLogger.decryptAttributeFailure).toHaveBeenCalledWith(
        'attrThree',
        { type: 'known-type-1', id: 'object-id' },
        mockUser
      );
    });

    it('fails to decrypt if ID does not match', async () => {
      const mockUser = mockAuthenticatedUser();
      await expect(
        service.decryptAttributes({ type: 'known-type-1', id: 'object-id*' }, encryptedAttributes, {
          user: mockUser,
        })
      ).rejects.toThrowError(EncryptionError);

      expect(mockAuditLogger.decryptAttributesSuccess).not.toHaveBeenCalled();
      expect(mockAuditLogger.decryptAttributeFailure).toHaveBeenCalledWith(
        'attrThree',
        { type: 'known-type-1', id: 'object-id*' },
        mockUser
      );
    });

    it('fails to decrypt if type does not match', async () => {
      const mockUser = mockAuthenticatedUser();
      await expect(
        service.decryptAttributes({ type: 'known-type-2', id: 'object-id' }, encryptedAttributes, {
          user: mockUser,
        })
      ).rejects.toThrowError(EncryptionError);

      expect(mockAuditLogger.decryptAttributesSuccess).not.toHaveBeenCalled();
      expect(mockAuditLogger.decryptAttributeFailure).toHaveBeenCalledWith(
        'attrThree',
        { type: 'known-type-2', id: 'object-id' },
        mockUser
      );
    });

    it('fails to decrypt if namespace does not match', async () => {
      encryptedAttributes = await service.encryptAttributes(
        { type: 'known-type-1', id: 'object-id', namespace: 'object-ns' },
        { attrOne: 'one', attrTwo: 'two', attrThree: 'three' }
      );

      const mockUser = mockAuthenticatedUser();
      await expect(
        service.decryptAttributes(
          { type: 'known-type-1', id: 'object-id', namespace: 'object-NS' },
          encryptedAttributes,
          { user: mockUser }
        )
      ).rejects.toThrowError(EncryptionError);

      expect(mockAuditLogger.decryptAttributesSuccess).not.toHaveBeenCalled();
      expect(mockAuditLogger.decryptAttributeFailure).toHaveBeenCalledWith(
        'attrThree',
        { type: 'known-type-1', id: 'object-id', namespace: 'object-NS' },
        mockUser
      );
    });

    it('fails to decrypt if namespace is expected, but is not provided', async () => {
      encryptedAttributes = await service.encryptAttributes(
        { type: 'known-type-1', id: 'object-id', namespace: 'object-ns' },
        { attrOne: 'one', attrTwo: 'two', attrThree: 'three' }
      );

      const mockUser = mockAuthenticatedUser();
      await expect(
        service.decryptAttributes({ type: 'known-type-1', id: 'object-id' }, encryptedAttributes, {
          user: mockUser,
        })
      ).rejects.toThrowError(EncryptionError);

      expect(mockAuditLogger.decryptAttributesSuccess).not.toHaveBeenCalled();
      expect(mockAuditLogger.decryptAttributeFailure).toHaveBeenCalledWith(
        'attrThree',
        { type: 'known-type-1', id: 'object-id' },
        mockUser
      );
    });

    it('fails to decrypt if encrypted attribute is defined, but not a string', async () => {
      const mockUser = mockAuthenticatedUser();
      await expect(
        service.decryptAttributes(
          { type: 'known-type-1', id: 'object-id' },
          { ...encryptedAttributes, attrThree: 2 },
          { user: mockUser }
        )
      ).rejects.toThrowError(
        'Encrypted "attrThree" attribute should be a string, but found number'
      );

      expect(mockAuditLogger.decryptAttributesSuccess).not.toHaveBeenCalled();
      expect(mockAuditLogger.decryptAttributeFailure).toHaveBeenCalledWith(
        'attrThree',
        { type: 'known-type-1', id: 'object-id' },
        mockUser
      );
    });

    it('fails to decrypt if encrypted attribute is not correct', async () => {
      const mockUser = mockAuthenticatedUser();
      await expect(
        service.decryptAttributes(
          { type: 'known-type-1', id: 'object-id' },
          { ...encryptedAttributes, attrThree: 'some-unknown-string' },
          { user: mockUser }
        )
      ).rejects.toThrowError(EncryptionError);

      expect(mockAuditLogger.decryptAttributesSuccess).not.toHaveBeenCalled();
      expect(mockAuditLogger.decryptAttributeFailure).toHaveBeenCalledWith(
        'attrThree',
        { type: 'known-type-1', id: 'object-id' },
        mockUser
      );
    });

    it('fails to decrypt if the AAD attribute has changed', async () => {
      const mockUser = mockAuthenticatedUser();
      await expect(
        service.decryptAttributes(
          { type: 'known-type-1', id: 'object-id' },
          { ...encryptedAttributes, attrOne: 'oNe' },
          { user: mockUser }
        )
      ).rejects.toThrowError(EncryptionError);

      expect(mockAuditLogger.decryptAttributesSuccess).not.toHaveBeenCalled();
      expect(mockAuditLogger.decryptAttributeFailure).toHaveBeenCalledWith(
        'attrThree',
        { type: 'known-type-1', id: 'object-id' },
        mockUser
      );
    });

    it('fails if encrypted with another encryption key', async () => {
      service = new EncryptedSavedObjectsService(
        nodeCrypto({ encryptionKey: 'encryption-key-abc*' }),
        loggingSystemMock.create().get(),
        mockAuditLogger
      );

      service.registerType({
        type: 'known-type-1',
        attributesToEncrypt: new Set(['attrThree']),
      });

      const mockUser = mockAuthenticatedUser();
      await expect(
        service.decryptAttributes({ type: 'known-type-1', id: 'object-id' }, encryptedAttributes, {
          user: mockUser,
        })
      ).rejects.toThrowError(EncryptionError);

      expect(mockAuditLogger.decryptAttributesSuccess).not.toHaveBeenCalled();
      expect(mockAuditLogger.decryptAttributeFailure).toHaveBeenCalledWith(
        'attrThree',
        { type: 'known-type-1', id: 'object-id' },
        mockUser
      );
    });
  });
});

describe('#encryptAttributesSync', () => {
  beforeEach(() => {
    mockNodeCrypto.encryptSync.mockImplementation(
      (valueToEncrypt, aad) => `|${valueToEncrypt}|${aad}|`
    );

    service = new EncryptedSavedObjectsService(
      mockNodeCrypto,
      loggingSystemMock.create().get(),
      mockAuditLogger
    );
  });

  it('does not encrypt attributes that are not supposed to be encrypted', () => {
    const attributes = { attrOne: 'one', attrTwo: 'two', attrThree: 'three' };
    service.registerType({
      type: 'known-type-1',
      attributesToEncrypt: new Set(['attrFour']),
    });
    expect(
      service.encryptAttributesSync({ type: 'known-type-1', id: 'object-id' }, attributes)
    ).toEqual({
      attrOne: 'one',
      attrTwo: 'two',
      attrThree: 'three',
    });
  });

  it('encrypts only attributes that are supposed to be encrypted', () => {
    const attributes = { attrOne: 'one', attrTwo: 'two', attrThree: 'three', attrFour: null };
    service.registerType({
      type: 'known-type-1',
      attributesToEncrypt: new Set(['attrOne', 'attrThree', 'attrFour']),
    });

    expect(
      service.encryptAttributesSync({ type: 'known-type-1', id: 'object-id' }, attributes)
    ).toEqual({
      attrOne: '|one|["known-type-1","object-id",{"attrTwo":"two"}]|',
      attrTwo: 'two',
      attrThree: '|three|["known-type-1","object-id",{"attrTwo":"two"}]|',
      attrFour: null,
    });
  });

  it('encrypts only attributes that are supposed to be encrypted even if not all provided', () => {
    const attributes = { attrTwo: 'two', attrThree: 'three' };

    service.registerType({
      type: 'known-type-1',
      attributesToEncrypt: new Set(['attrOne', 'attrThree']),
    });

    expect(
      service.encryptAttributesSync({ type: 'known-type-1', id: 'object-id' }, attributes)
    ).toEqual({
      attrTwo: 'two',
      attrThree: '|three|["known-type-1","object-id",{"attrTwo":"two"}]|',
    });
  });

  it('includes `namespace` into AAD if provided', () => {
    const attributes = { attrTwo: 'two', attrThree: 'three' };

    service.registerType({
      type: 'known-type-1',
      attributesToEncrypt: new Set(['attrOne', 'attrThree']),
    });

    expect(
      service.encryptAttributesSync(
        { type: 'known-type-1', id: 'object-id', namespace: 'object-ns' },
        attributes
      )
    ).toEqual({
      attrTwo: 'two',
      attrThree: '|three|["object-ns","known-type-1","object-id",{"attrTwo":"two"}]|',
    });
  });

  it('does not include specified attributes to AAD', () => {
    const knownType1attributes = { attrOne: 'one', attrTwo: 'two', attrThree: 'three' };
    service.registerType({
      type: 'known-type-1',
      attributesToEncrypt: new Set(['attrThree']),
    });

    const knownType2attributes = { attrOne: 'one', attrTwo: 'two', attrThree: 'three' };
    service.registerType({
      type: 'known-type-2',
      attributesToEncrypt: new Set(['attrThree']),
      attributesToExcludeFromAAD: new Set(['attrTwo']),
    });

    expect(
      service.encryptAttributesSync(
        { type: 'known-type-1', id: 'object-id-1' },
        knownType1attributes
      )
    ).toEqual({
      attrOne: 'one',
      attrTwo: 'two',
      attrThree: '|three|["known-type-1","object-id-1",{"attrOne":"one","attrTwo":"two"}]|',
    });
    expect(
      service.encryptAttributesSync(
        { type: 'known-type-2', id: 'object-id-2' },
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
    service.registerType({
      type: 'known-type-1',
      attributesToEncrypt: new Set(['attrOne', 'attrThree']),
    });

    expect(
      service.encryptAttributesSync({ type: 'known-type-1', id: 'object-id-1' }, attributes)
    ).toEqual({
      attrOne: '|one|["known-type-1","object-id-1",{}]|',
      attrThree: '|three|["known-type-1","object-id-1",{}]|',
    });
  });

  it('fails if encryption of any attribute fails', () => {
    const attributes = { attrOne: 'one', attrTwo: 'two', attrThree: 'three' };
    service.registerType({
      type: 'known-type-1',
      attributesToEncrypt: new Set(['attrOne', 'attrThree']),
    });

    mockNodeCrypto.encryptSync
      .mockImplementationOnce(() => 'Successfully encrypted attrOne')
      .mockImplementationOnce(() => {
        throw new Error('Something went wrong with attrThree...');
      });

    expect(() =>
      service.encryptAttributesSync({ type: 'known-type-1', id: 'object-id' }, attributes)
    ).toThrowError(EncryptionError);

    expect(attributes).toEqual({
      attrOne: 'one',
      attrTwo: 'two',
      attrThree: 'three',
    });
  });
});

describe('#decryptAttributesSync', () => {
  it('does not decrypt attributes that are not supposed to be decrypted', () => {
    const attributes = { attrOne: 'one', attrTwo: 'two', attrThree: 'three' };

    service.registerType({
      type: 'known-type-1',
      attributesToEncrypt: new Set(['attrFour']),
    });

    expect(
      service.decryptAttributesSync({ type: 'known-type-1', id: 'object-id' }, attributes)
    ).toEqual({
      attrOne: 'one',
      attrTwo: 'two',
      attrThree: 'three',
    });
  });

  it('decrypts only attributes that are supposed to be decrypted', () => {
    const attributes = { attrOne: 'one', attrTwo: 'two', attrThree: 'three', attrFour: null };

    service.registerType({
      type: 'known-type-1',
      attributesToEncrypt: new Set(['attrOne', 'attrThree', 'attrFour']),
    });

    const encryptedAttributes = service.encryptAttributesSync(
      { type: 'known-type-1', id: 'object-id' },
      attributes
    );
    expect(encryptedAttributes).toEqual({
      attrOne: expect.not.stringMatching(/^one$/),
      attrTwo: 'two',
      attrThree: expect.not.stringMatching(/^three$/),
      attrFour: null,
    });

    expect(
      service.decryptAttributesSync({ type: 'known-type-1', id: 'object-id' }, encryptedAttributes)
    ).toEqual({
      attrOne: 'one',
      attrTwo: 'two',
      attrThree: 'three',
      attrFour: null,
    });
  });

  it('decrypts only attributes that are supposed to be encrypted even if not all provided', () => {
    const attributes = { attrTwo: 'two', attrThree: 'three' };

    service.registerType({
      type: 'known-type-1',
      attributesToEncrypt: new Set(['attrOne', 'attrThree']),
    });

    const encryptedAttributes = service.encryptAttributesSync(
      { type: 'known-type-1', id: 'object-id' },
      attributes
    );
    expect(encryptedAttributes).toEqual({
      attrTwo: 'two',
      attrThree: expect.not.stringMatching(/^three$/),
    });

    expect(
      service.decryptAttributesSync({ type: 'known-type-1', id: 'object-id' }, encryptedAttributes)
    ).toEqual({
      attrTwo: 'two',
      attrThree: 'three',
    });
  });

  it('decrypts if all attributes that contribute to AAD are present', () => {
    const attributes = { attrOne: 'one', attrTwo: 'two', attrThree: 'three' };

    service.registerType({
      type: 'known-type-1',
      attributesToEncrypt: new Set(['attrThree']),
      attributesToExcludeFromAAD: new Set(['attrOne']),
    });

    const encryptedAttributes = service.encryptAttributesSync(
      { type: 'known-type-1', id: 'object-id' },
      attributes
    );
    expect(encryptedAttributes).toEqual({
      attrOne: 'one',
      attrTwo: 'two',
      attrThree: expect.not.stringMatching(/^three$/),
    });

    const attributesWithoutAttr = { attrTwo: 'two', attrThree: encryptedAttributes.attrThree };

    expect(
      service.decryptAttributesSync(
        { type: 'known-type-1', id: 'object-id' },
        attributesWithoutAttr
      )
    ).toEqual({
      attrTwo: 'two',
      attrThree: 'three',
    });
  });

  it('decrypts even if attributes in AAD are defined in a different order', () => {
    const attributes = { attrOne: 'one', attrTwo: 'two', attrThree: 'three' };

    service.registerType({
      type: 'known-type-1',
      attributesToEncrypt: new Set(['attrThree']),
    });

    const encryptedAttributes = service.encryptAttributesSync(
      { type: 'known-type-1', id: 'object-id' },
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
      service.decryptAttributesSync(
        { type: 'known-type-1', id: 'object-id' },
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

    service.registerType({
      type: 'known-type-1',
      attributesToEncrypt: new Set(['attrThree']),
    });

    const encryptedAttributes = service.encryptAttributesSync(
      { type: 'known-type-1', id: 'object-id', namespace: 'object-ns' },
      attributes
    );
    expect(encryptedAttributes).toEqual({
      attrOne: 'one',
      attrTwo: 'two',
      attrThree: expect.not.stringMatching(/^three$/),
    });

    expect(
      service.decryptAttributesSync(
        { type: 'known-type-1', id: 'object-id', namespace: 'object-ns' },
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
    service.registerType({
      type: 'known-type-1',
      attributesToEncrypt: new Set(['attrOne', 'attrThree']),
    });

    const encryptedAttributes = service.encryptAttributesSync(
      { type: 'known-type-1', id: 'object-id' },
      attributes
    );
    expect(encryptedAttributes).toEqual({
      attrOne: expect.not.stringMatching(/^one$/),
      attrThree: expect.not.stringMatching(/^three$/),
    });

    expect(
      service.decryptAttributesSync({ type: 'known-type-1', id: 'object-id' }, encryptedAttributes)
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

    service.registerType({
      type: 'known-type-1',
      attributesToEncrypt: new Set(['attrOne', 'attrThree', 'attrFour', 'attrFive', 'attrSix']),
    });

    const encryptedAttributes = service.encryptAttributesSync(
      { type: 'known-type-1', id: 'object-id' },
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
      service.decryptAttributesSync({ type: 'known-type-1', id: 'object-id' }, encryptedAttributes)
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

    const type1 = {
      type: 'known-type-1',
      attributesToEncrypt: new Set(['attrThree']),
    };

    const type2 = {
      type: 'known-type-2',
      attributesToEncrypt: new Set(['attrThree']),
    };

    beforeEach(() => {
      service.registerType(type1);
      service.registerType(type2);

      const attributes = { attrOne: 'one', attrTwo: 'two', attrThree: 'three' };

      encryptedAttributes = service.encryptAttributesSync(
        { type: 'known-type-1', id: 'object-id' },
        attributes
      );
    });

    it('fails to decrypt if not all attributes that contribute to AAD are present', () => {
      const attributesWithoutAttr = { attrTwo: 'two', attrThree: encryptedAttributes.attrThree };
      expect(() =>
        service.decryptAttributesSync(
          { type: 'known-type-1', id: 'object-id' },
          attributesWithoutAttr
        )
      ).toThrowError(EncryptionError);
    });

    it('fails to decrypt if ID does not match', () => {
      expect(() =>
        service.decryptAttributesSync(
          { type: 'known-type-1', id: 'object-id*' },
          encryptedAttributes
        )
      ).toThrowError(EncryptionError);
    });

    it('fails to decrypt if type does not match', () => {
      expect(() =>
        service.decryptAttributesSync(
          { type: 'known-type-2', id: 'object-id' },
          encryptedAttributes
        )
      ).toThrowError(EncryptionError);
    });

    it('fails to decrypt if namespace does not match', () => {
      encryptedAttributes = service.encryptAttributesSync(
        { type: 'known-type-1', id: 'object-id', namespace: 'object-ns' },
        { attrOne: 'one', attrTwo: 'two', attrThree: 'three' }
      );

      expect(() =>
        service.decryptAttributesSync(
          { type: 'known-type-1', id: 'object-id', namespace: 'object-NS' },
          encryptedAttributes
        )
      ).toThrowError(EncryptionError);
    });

    it('fails to decrypt if namespace is expected, but is not provided', () => {
      encryptedAttributes = service.encryptAttributesSync(
        { type: 'known-type-1', id: 'object-id', namespace: 'object-ns' },
        { attrOne: 'one', attrTwo: 'two', attrThree: 'three' }
      );

      expect(() =>
        service.decryptAttributesSync(
          { type: 'known-type-1', id: 'object-id' },
          encryptedAttributes
        )
      ).toThrowError(EncryptionError);
    });

    it('fails to decrypt if encrypted attribute is defined, but not a string', () => {
      expect(() =>
        service.decryptAttributesSync(
          { type: 'known-type-1', id: 'object-id' },
          {
            ...encryptedAttributes,
            attrThree: 2,
          }
        )
      ).toThrowError('Encrypted "attrThree" attribute should be a string, but found number');
    });

    it('fails to decrypt if encrypted attribute is not correct', () => {
      expect(() =>
        service.decryptAttributesSync(
          { type: 'known-type-1', id: 'object-id' },
          {
            ...encryptedAttributes,
            attrThree: 'some-unknown-string',
          }
        )
      ).toThrowError(EncryptionError);
    });

    it('fails to decrypt if the AAD attribute has changed', () => {
      expect(() =>
        service.decryptAttributesSync(
          { type: 'known-type-1', id: 'object-id' },
          {
            ...encryptedAttributes,
            attrOne: 'oNe',
          }
        )
      ).toThrowError(EncryptionError);
    });

    it('fails if encrypted with another encryption key', () => {
      service = new EncryptedSavedObjectsService(
        nodeCrypto({ encryptionKey: 'encryption-key-abc*' }),
        loggingSystemMock.create().get(),
        mockAuditLogger
      );

      service.registerType({
        type: 'known-type-1',
        attributesToEncrypt: new Set(['attrThree']),
      });

      expect(() =>
        service.decryptAttributesSync(
          { type: 'known-type-1', id: 'object-id' },
          encryptedAttributes
        )
      ).toThrowError(EncryptionError);
    });
  });
});
