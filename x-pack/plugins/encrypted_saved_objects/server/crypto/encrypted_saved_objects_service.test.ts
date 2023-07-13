/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Crypto } from '@elastic/node-crypto';
import nodeCrypto from '@elastic/node-crypto';

import type { ISavedObjectsRepository } from '@kbn/core-saved-objects-api-server';
import type { SavedObjectsServiceStart } from '@kbn/core-saved-objects-server';
import { coreMock, loggingSystemMock, savedObjectsRepositoryMock } from '@kbn/core/server/mocks';
import { mockAuthenticatedUser } from '@kbn/security-plugin/common/model/authenticated_user.mock';

import { VERSIONED_ENCYRPTION_DEFINITION_TYPE } from '../saved_objects';
import type { EncryptedSavedObjectTypeRegistration } from './encrypted_saved_objects_service';
import {
  ENCRPYPTED_HEADER_EOH,
  EncryptedSavedObjectsService,
} from './encrypted_saved_objects_service';
import { EncryptionError } from './encryption_error';

function createNodeCryptMock(encryptionKey: string) {
  const crypto = nodeCrypto({ encryptionKey });
  const nodeCryptoMock: jest.Mocked<Crypto> = {
    encrypt: jest.fn(),
    decrypt: jest.fn(),
    encryptSync: jest.fn(),
    decryptSync: jest.fn(),
  };

  // Call actual `@elastic/node-crypto` by default, but allow to override implementation in tests.
  nodeCryptoMock.encrypt.mockImplementation(async (input: any, aad?: string) =>
    crypto.encrypt(input, aad)
  );
  nodeCryptoMock.decrypt.mockImplementation(
    async (encryptedOutput: string | Buffer, aad?: string) => crypto.decrypt(encryptedOutput, aad)
  );
  nodeCryptoMock.encryptSync.mockImplementation((input: any, aad?: string) =>
    crypto.encryptSync(input, aad)
  );
  nodeCryptoMock.decryptSync.mockImplementation((encryptedOutput: string | Buffer, aad?: string) =>
    crypto.decryptSync(encryptedOutput, aad)
  );

  return nodeCryptoMock;
}

// <T extends Record<string, unknown>>
function removeEncryptionHeaders(attributes: Record<string, unknown>): Record<string, unknown> {
  for (const key of Object.keys(attributes)) {
    if (typeof attributes[key] === 'string') {
      const parts = String(attributes[key]).split(ENCRPYPTED_HEADER_EOH);
      if (parts.length > 1) attributes[key] = parts[1];
    }
  }
  return attributes;
}

let mockNodeCrypto: jest.Mocked<Crypto>;
let service: EncryptedSavedObjectsService;
let mockSavedObjects: jest.Mocked<SavedObjectsServiceStart>;
let mockSavedObjectsRepo: jest.Mocked<ISavedObjectsRepository>;

// Embedding excluded AAD fields POC rev2
// This function helps us simulate the plugin setup and start phases
function setup(types?: EncryptedSavedObjectTypeRegistration[]) {
  mockNodeCrypto = createNodeCryptMock('encryption-key-abc');
  const coreSetupMock = coreMock.createSetup();
  const coreStartMock = coreMock.createStart();
  coreSetupMock.getStartServices.mockResolvedValue([coreStartMock, {}, {}]);
  mockSavedObjectsRepo = savedObjectsRepositoryMock.create();
  mockSavedObjects = coreStartMock.savedObjects;
  mockSavedObjects.createInternalRepository.mockImplementation((request, params) => {
    return mockSavedObjectsRepo;
  });

  // simulate plugin setup phase
  service = new EncryptedSavedObjectsService({
    primaryCrypto: mockNodeCrypto,
    logger: loggingSystemMock.create().get(),
  });
  types?.forEach((esoType) => service.registerType(esoType));

  // simulate plugin start phase
  if (!!types) {
    service.initializeVersionedMetadata(mockSavedObjects);
    expect(mockSavedObjects.createInternalRepository).toHaveBeenCalledTimes(1);
  }
}

beforeEach(() => {
  setup();
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
    });
  });

  describe('without encryption key', () => {
    beforeEach(() => {
      service = new EncryptedSavedObjectsService({
        logger: loggingSystemMock.create().get(),
      });
    });

    it('does not fail if none of attributes are supposed to be encrypted', async () => {
      const attributes = { attrOne: 'one', attrTwo: 'two', attrThree: 'three' };

      service.registerType({ type: 'known-type-1', attributesToEncrypt: new Set(['attrFour']) });

      await expect(
        service.stripOrDecryptAttributes({ id: 'known-id', type: 'known-type-1' }, attributes)
      ).resolves.toEqual({ attributes: { attrOne: 'one', attrTwo: 'two', attrThree: 'three' } });
    });

    it('does not fail if there are attributes are supposed to be encrypted, but should be stripped', async () => {
      const attributes = { attrOne: 'one', attrTwo: 'two', attrThree: 'three' };

      service.registerType({
        type: 'known-type-1',
        attributesToEncrypt: new Set(['attrOne', 'attrThree']),
      });

      await expect(
        service.stripOrDecryptAttributes({ id: 'known-id', type: 'known-type-1' }, attributes)
      ).resolves.toEqual({ attributes: { attrTwo: 'two' } });
    });

    it('fails if needs to decrypt any attribute', async () => {
      service.registerType({
        type: 'known-type-1',
        attributesToEncrypt: new Set([
          'attrOne',
          { key: 'attrThree', dangerouslyExposeValue: true },
        ]),
      });

      const mockUser = mockAuthenticatedUser();
      const { attributes, error } = await service.stripOrDecryptAttributes(
        { type: 'known-type-1', id: 'object-id' },
        { attrOne: 'one', attrTwo: 'two', attrThree: 'three' },
        undefined,
        { user: mockUser }
      );

      expect(attributes).toEqual({ attrTwo: 'two' });

      const encryptionError = error as EncryptionError;
      expect(encryptionError.attributeName).toBe('attrThree');
      expect(encryptionError.message).toBe('Unable to decrypt attribute "attrThree"');
      expect(encryptionError.cause).toEqual(
        new Error('Decryption is disabled because of missing decryption keys.')
      );
    });
  });
});

describe('#stripOrDecryptAttributesSync', () => {
  it('does not strip attributes from unknown types', () => {
    const attributes = { attrOne: 'one', attrTwo: 'two', attrThree: 'three' };

    expect(
      service.stripOrDecryptAttributesSync({ id: 'unknown-id', type: 'unknown-type' }, attributes)
    ).toEqual({ attributes: { attrOne: 'one', attrTwo: 'two', attrThree: 'three' } });
  });

  it('does not strip any attributes if none of them are supposed to be encrypted', () => {
    const attributes = { attrOne: 'one', attrTwo: 'two', attrThree: 'three' };

    service.registerType({ type: 'known-type-1', attributesToEncrypt: new Set(['attrFour']) });

    expect(
      service.stripOrDecryptAttributesSync({ id: 'known-id', type: 'known-type-1' }, attributes)
    ).toEqual({ attributes: { attrOne: 'one', attrTwo: 'two', attrThree: 'three' } });
  });

  it('strips only attributes that are supposed to be encrypted', () => {
    const attributes = { attrOne: 'one', attrTwo: 'two', attrThree: 'three' };

    service.registerType({
      type: 'known-type-1',
      attributesToEncrypt: new Set(['attrOne', 'attrThree']),
    });

    expect(
      service.stripOrDecryptAttributesSync({ id: 'known-id', type: 'known-type-1' }, attributes)
    ).toEqual({ attributes: { attrTwo: 'two' } });
  });

  describe('with `dangerouslyExposeValue`', () => {
    it('decrypts and exposes values with `dangerouslyExposeValue` set to `true`', () => {
      service.registerType({
        type: 'known-type-1',
        attributesToEncrypt: new Set([
          'attrOne',
          { key: 'attrThree', dangerouslyExposeValue: true },
        ]),
      });

      const attributes = { attrOne: 'one', attrTwo: 'two', attrThree: 'three' };
      const encryptedAttributes = service.encryptAttributesSync(
        { type: 'known-type-1', id: 'object-id' },
        attributes
      );

      const mockUser = mockAuthenticatedUser();
      expect(
        service.stripOrDecryptAttributesSync(
          { type: 'known-type-1', id: 'object-id' },
          encryptedAttributes,
          undefined,
          { user: mockUser }
        )
      ).toEqual({ attributes: { attrTwo: 'two', attrThree: 'three' } });
    });

    it('exposes values with `dangerouslyExposeValue` set to `true` using original attributes if provided', () => {
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

      expect(
        service.stripOrDecryptAttributesSync(
          { type: 'known-type-1', id: 'object-id' },
          encryptedAttributes,
          attributes
        )
      ).toEqual({ attributes: { attrTwo: 'two', attrThree: 'three' } });
    });

    it('strips attributes with `dangerouslyExposeValue` set to `true` if failed to decrypt', () => {
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
      const encryptedAttributes = service.encryptAttributesSync(
        { type: 'known-type-1', id: 'object-id' },
        attributes
      );

      encryptedAttributes.attrThree = 'some-undecryptable-value';

      const mockUser = mockAuthenticatedUser();
      const { attributes: decryptedAttributes, error } = service.stripOrDecryptAttributesSync(
        { type: 'known-type-1', id: 'object-id' },
        encryptedAttributes,
        undefined,
        { user: mockUser }
      );

      expect(decryptedAttributes).toEqual({ attrZero: 'zero', attrTwo: 'two', attrFour: 'four' });
      expect(error).toMatchInlineSnapshot(`[Error: Unable to decrypt attribute "attrThree"]`);
    });
  });

  describe('without encryption key', () => {
    beforeEach(() => {
      service = new EncryptedSavedObjectsService({
        logger: loggingSystemMock.create().get(),
      });
    });

    it('does not fail if none of attributes are supposed to be encrypted', () => {
      const attributes = { attrOne: 'one', attrTwo: 'two', attrThree: 'three' };

      service.registerType({ type: 'known-type-1', attributesToEncrypt: new Set(['attrFour']) });

      expect(
        service.stripOrDecryptAttributesSync({ id: 'known-id', type: 'known-type-1' }, attributes)
      ).toEqual({ attributes: { attrOne: 'one', attrTwo: 'two', attrThree: 'three' } });
    });

    it('does not fail if there are attributes are supposed to be encrypted, but should be stripped', () => {
      const attributes = { attrOne: 'one', attrTwo: 'two', attrThree: 'three' };

      service.registerType({
        type: 'known-type-1',
        attributesToEncrypt: new Set(['attrOne', 'attrThree']),
      });

      expect(
        service.stripOrDecryptAttributesSync({ id: 'known-id', type: 'known-type-1' }, attributes)
      ).toEqual({ attributes: { attrTwo: 'two' } });
    });

    it('fails if needs to decrypt any attribute', () => {
      service.registerType({
        type: 'known-type-1',
        attributesToEncrypt: new Set([
          'attrOne',
          { key: 'attrThree', dangerouslyExposeValue: true },
        ]),
      });

      const mockUser = mockAuthenticatedUser();
      const { attributes, error } = service.stripOrDecryptAttributesSync(
        { type: 'known-type-1', id: 'object-id' },
        { attrOne: 'one', attrTwo: 'two', attrThree: 'three' },
        undefined,
        { user: mockUser }
      );

      expect(attributes).toEqual({ attrTwo: 'two' });

      const encryptionError = error as EncryptionError;
      expect(encryptionError.attributeName).toBe('attrThree');
      expect(encryptionError.message).toBe('Unable to decrypt attribute "attrThree"');
      expect(encryptionError.cause).toEqual(
        new Error('Decryption is disabled because of missing decryption keys.')
      );
    });
  });
});

describe('#encryptAttributes', () => {
  beforeEach(() => {
    mockNodeCrypto.encrypt.mockImplementation(
      async (valueToEncrypt, aad) => `|${valueToEncrypt}|${aad}|`
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
  });

  it('does not encrypt attributes that are not supposed to be encrypted', async () => {
    const attributes = { attrOne: 'one', attrTwo: 'two', attrThree: 'three' };

    service.registerType({ type: 'known-type-1', attributesToEncrypt: new Set(['attrFour']) });

    const encrypted = await service.encryptAttributes(
      { type: 'known-type-1', id: 'object-id' },
      attributes
    );

    expect(encrypted).toEqual({
      attrOne: 'one',
      attrTwo: 'two',
      attrThree: 'three',
    });
  });

  it('encrypts only attributes that are supposed to be encrypted', async () => {
    const attributes = { attrOne: 'one', attrTwo: 'two', attrThree: 'three', attrFour: null };

    service.registerType({
      type: 'known-type-1',
      attributesToEncrypt: new Set(['attrOne', 'attrThree', 'attrFour']),
    });

    const mockUser = mockAuthenticatedUser();

    const encrypted = await service.encryptAttributes(
      { type: 'known-type-1', id: 'object-id' },
      attributes,
      {
        user: mockUser,
      }
    );

    expect(removeEncryptionHeaders(encrypted)).toEqual({
      attrOne: '|one|["known-type-1","object-id",{"attrTwo":"two"}]|',
      attrTwo: 'two',
      attrThree: '|three|["known-type-1","object-id",{"attrTwo":"two"}]|',
      attrFour: null,
    });
  });

  it('encrypts only using primary crypto', async () => {
    const attributes = { attrOne: 'one', attrTwo: 'two', attrThree: 'three', attrFour: null };

    const decryptionOnlyCrypto = createNodeCryptMock('some-key');
    service = new EncryptedSavedObjectsService({
      primaryCrypto: mockNodeCrypto,
      decryptionOnlyCryptos: [decryptionOnlyCrypto],
      logger: loggingSystemMock.create().get(),
    });
    service.registerType({
      type: 'known-type-1',
      attributesToEncrypt: new Set(['attrOne', 'attrThree', 'attrFour']),
    });

    const encrypted = await service.encryptAttributes(
      { type: 'known-type-1', id: 'object-id' },
      attributes
    );

    expect(removeEncryptionHeaders(encrypted)).toEqual({
      attrOne: '|one|["known-type-1","object-id",{"attrTwo":"two"}]|',
      attrTwo: 'two',
      attrThree: '|three|["known-type-1","object-id",{"attrTwo":"two"}]|',
      attrFour: null,
    });

    expect(decryptionOnlyCrypto.encrypt).not.toHaveBeenCalled();
    expect(decryptionOnlyCrypto.encryptSync).not.toHaveBeenCalled();
  });

  it('encrypts only attributes that are supposed to be encrypted even if not all provided', async () => {
    const attributes = { attrTwo: 'two', attrThree: 'three' };

    service.registerType({
      type: 'known-type-1',
      attributesToEncrypt: new Set(['attrOne', 'attrThree']),
    });

    const mockUser = mockAuthenticatedUser();
    const encrypted = await service.encryptAttributes(
      { type: 'known-type-1', id: 'object-id' },
      attributes,
      {
        user: mockUser,
      }
    );
    expect(removeEncryptionHeaders(encrypted)).toEqual({
      attrTwo: 'two',
      attrThree: '|three|["known-type-1","object-id",{"attrTwo":"two"}]|',
    });
  });

  it('includes `namespace` into AAD if provided', async () => {
    const attributes = { attrTwo: 'two', attrThree: 'three' };

    service.registerType({
      type: 'known-type-1',
      attributesToEncrypt: new Set(['attrOne', 'attrThree']),
    });

    const mockUser = mockAuthenticatedUser();
    const encrypted = await service.encryptAttributes(
      { type: 'known-type-1', id: 'object-id', namespace: 'object-ns' },
      attributes,
      { user: mockUser }
    );
    expect(removeEncryptionHeaders(encrypted)).toEqual({
      attrTwo: 'two',
      attrThree: '|three|["object-ns","known-type-1","object-id",{"attrTwo":"two"}]|',
    });
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

    const encrypted1 = await service.encryptAttributes(
      { type: 'known-type-1', id: 'object-id-1' },
      knownType1attributes
    );
    expect(removeEncryptionHeaders(encrypted1)).toEqual({
      attrOne: 'one',
      attrTwo: 'two',
      attrThree: '|three|["known-type-1","object-id-1",{"attrOne":"one","attrTwo":"two"}]|',
    });

    const encrypted2 = await service.encryptAttributes(
      { type: 'known-type-2', id: 'object-id-2' },
      knownType2attributes
    );
    expect(removeEncryptionHeaders(encrypted2)).toEqual({
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

    const encrypted = await service.encryptAttributes(
      { type: 'known-type-1', id: 'object-id-1' },
      attributes
    );

    expect(removeEncryptionHeaders(encrypted)).toEqual({
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
  });

  describe('without encryption key', () => {
    beforeEach(() => {
      service = new EncryptedSavedObjectsService({
        logger: loggingSystemMock.create().get(),
      });
    });

    it('does not fail if none of attributes are supposed to be encrypted', async () => {
      const attributes = { attrOne: 'one', attrTwo: 'two', attrThree: 'three' };

      service.registerType({ type: 'known-type-1', attributesToEncrypt: new Set(['attrFour']) });

      await expect(
        service.encryptAttributes({ type: 'known-type-1', id: 'object-id' }, attributes)
      ).resolves.toEqual({
        attrOne: 'one',
        attrTwo: 'two',
        attrThree: 'three',
      });
    });

    it('fails if needs to encrypt any attribute', async () => {
      const attributes = { attrOne: 'one', attrTwo: 'two', attrThree: 'three' };
      service.registerType({
        type: 'known-type-1',
        attributesToEncrypt: new Set(['attrOne', 'attrThree']),
      });

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
    });
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
  });

  describe('with isTypeBeingConverted option', () => {
    it('retries decryption without namespace', async () => {
      const attributes = { attrOne: 'one', attrTwo: 'two', attrThree: 'three' };

      service.registerType({
        type: 'known-type-1',
        attributesToEncrypt: new Set(['attrThree']),
      });

      const encryptedAttributes = service.encryptAttributesSync(
        { type: 'known-type-1', id: 'object-id' }, // namespace was not included in descriptor during encryption
        attributes
      );
      expect(removeEncryptionHeaders(encryptedAttributes)).toEqual({
        attrOne: 'one',
        attrTwo: 'two',
        attrThree: expect.not.stringMatching(/^three$/),
      });

      const mockUser = mockAuthenticatedUser();
      await expect(
        service.decryptAttributes(
          { type: 'known-type-1', id: 'object-id', namespace: 'object-ns' },
          encryptedAttributes,
          { user: mockUser, isTypeBeingConverted: true }
        )
      ).resolves.toEqual({
        attrOne: 'one',
        attrTwo: 'two',
        attrThree: 'three',
      });
      expect(mockNodeCrypto.decrypt).toHaveBeenCalledTimes(2);
      expect(mockNodeCrypto.decrypt).toHaveBeenNthCalledWith(
        1, // first attempted to decrypt with the namespace in the descriptor (fail)
        expect.anything(),
        `["object-ns","known-type-1","object-id",{"attrOne":"one","attrTwo":"two"}]`
      );
      expect(mockNodeCrypto.decrypt).toHaveBeenNthCalledWith(
        2, // then attempted to decrypt without the namespace in the descriptor (success)
        expect.anything(),
        `["known-type-1","object-id",{"attrOne":"one","attrTwo":"two"}]`
      );
    });

    it('retries decryption without originId (old object ID)', async () => {
      const attributes = { attrOne: 'one', attrTwo: 'two', attrThree: 'three' };

      service.registerType({
        type: 'known-type-1',
        attributesToEncrypt: new Set(['attrThree']),
      });

      const encryptedAttributes = service.encryptAttributesSync(
        { type: 'known-type-1', id: 'object-id' }, // old object ID was not used in descriptor during encryption
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
          { type: 'known-type-1', id: 'object-id', namespace: undefined },
          encryptedAttributes,
          { user: mockUser, isTypeBeingConverted: true, originId: 'old-object-id' }
        )
      ).resolves.toEqual({
        attrOne: 'one',
        attrTwo: 'two',
        attrThree: 'three',
      });
      expect(mockNodeCrypto.decrypt).toHaveBeenCalledTimes(2);
      expect(mockNodeCrypto.decrypt).toHaveBeenNthCalledWith(
        1, // first attempted to decrypt with the old object ID in the descriptor (fail)
        expect.anything(),
        `["known-type-1","old-object-id",{"attrOne":"one","attrTwo":"two"}]`
      );
      expect(mockNodeCrypto.decrypt).toHaveBeenNthCalledWith(
        2, // then attempted to decrypt with the current object ID in the descriptor (success)
        expect.anything(),
        `["known-type-1","object-id",{"attrOne":"one","attrTwo":"two"}]`
      );
    });

    it('retries decryption without namespace *and* without originId (old object ID)', async () => {
      const attributes = { attrOne: 'one', attrTwo: 'two', attrThree: 'three' };

      service.registerType({
        type: 'known-type-1',
        attributesToEncrypt: new Set(['attrThree']),
      });

      const encryptedAttributes = service.encryptAttributesSync(
        { type: 'known-type-1', id: 'object-id' }, // namespace and old object ID were not used in descriptor during encryption
        attributes
      );
      expect(removeEncryptionHeaders(encryptedAttributes)).toEqual({
        attrOne: 'one',
        attrTwo: 'two',
        attrThree: expect.not.stringMatching(/^three$/),
      });

      const mockUser = mockAuthenticatedUser();
      await expect(
        service.decryptAttributes(
          { type: 'known-type-1', id: 'object-id', namespace: 'object-ns' },
          encryptedAttributes,
          { user: mockUser, isTypeBeingConverted: true, originId: 'old-object-id' }
        )
      ).resolves.toEqual({
        attrOne: 'one',
        attrTwo: 'two',
        attrThree: 'three',
      });
      expect(mockNodeCrypto.decrypt).toHaveBeenCalledTimes(4);
      expect(mockNodeCrypto.decrypt).toHaveBeenNthCalledWith(
        1, // first attempted to decrypt with the old object ID and namespace in the descriptor (fail)
        expect.anything(),
        `["object-ns","known-type-1","old-object-id",{"attrOne":"one","attrTwo":"two"}]`
      );
      expect(mockNodeCrypto.decrypt).toHaveBeenNthCalledWith(
        2, // then attempted to decrypt with the old object ID and no namespace in the descriptor (fail)
        expect.anything(),
        `["known-type-1","old-object-id",{"attrOne":"one","attrTwo":"two"}]`
      );
      expect(mockNodeCrypto.decrypt).toHaveBeenNthCalledWith(
        3, // first attempted to decrypt with the current object ID and namespace in the descriptor (fail)
        expect.anything(),
        `["object-ns","known-type-1","object-id",{"attrOne":"one","attrTwo":"two"}]`
      );
      expect(mockNodeCrypto.decrypt).toHaveBeenNthCalledWith(
        4, // then attempted to decrypt with the current object ID and no namespace in the descriptor (success)
        expect.anything(),
        `["known-type-1","object-id",{"attrOne":"one","attrTwo":"two"}]`
      );
    });
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
    });

    it('fails to decrypt if ID does not match', async () => {
      const mockUser = mockAuthenticatedUser();
      await expect(
        service.decryptAttributes({ type: 'known-type-1', id: 'object-id*' }, encryptedAttributes, {
          user: mockUser,
        })
      ).rejects.toThrowError(EncryptionError);
    });

    it('fails to decrypt if type does not match', async () => {
      const mockUser = mockAuthenticatedUser();
      await expect(
        service.decryptAttributes({ type: 'known-type-2', id: 'object-id' }, encryptedAttributes, {
          user: mockUser,
        })
      ).rejects.toThrowError(EncryptionError);
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
    });

    it('fails if retry decryption without namespace is not correct', async () => {
      const attributes = { attrOne: 'one', attrTwo: 'two', attrThree: 'three' };

      encryptedAttributes = service.encryptAttributesSync(
        { type: 'known-type-1', id: 'object-id', namespace: 'some-other-ns' },
        attributes
      );
      expect(encryptedAttributes).toEqual({
        attrOne: 'one',
        attrTwo: 'two',
        attrThree: expect.not.stringMatching(/^three$/),
      });

      const mockUser = mockAuthenticatedUser();
      await expect(() =>
        service.decryptAttributes(
          { type: 'known-type-1', id: 'object-id', namespace: 'object-ns' },
          encryptedAttributes,
          { user: mockUser, isTypeBeingConverted: true }
        )
      ).rejects.toThrowError(EncryptionError);
      expect(mockNodeCrypto.decrypt).toHaveBeenCalledTimes(2);
      expect(mockNodeCrypto.decrypt).toHaveBeenNthCalledWith(
        1, // first attempted to decrypt with the namespace in the descriptor (fail)
        expect.anything(),
        `["object-ns","known-type-1","object-id",{"attrOne":"one","attrTwo":"two"}]`
      );
      expect(mockNodeCrypto.decrypt).toHaveBeenNthCalledWith(
        2, // then attempted to decrypt without the namespace in the descriptor (fail)
        expect.anything(),
        `["known-type-1","object-id",{"attrOne":"one","attrTwo":"two"}]`
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
    });

    it('fails if encrypted with another encryption key', async () => {
      service = new EncryptedSavedObjectsService({
        primaryCrypto: nodeCrypto({ encryptionKey: 'encryption-key-abc*' }),
        logger: loggingSystemMock.create().get(),
      });

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
    });
  });

  describe('with decryption only keys', () => {
    function getService(primaryCrypto: Crypto, decryptionOnlyCryptos?: Readonly<Crypto[]>) {
      const esoService = new EncryptedSavedObjectsService({
        primaryCrypto,
        decryptionOnlyCryptos,
        logger: loggingSystemMock.create().get(),
      });

      esoService.registerType({
        type: 'known-type-1',
        attributesToEncrypt: new Set(['attrOne', 'attrThree', 'attrFour']),
      });

      return esoService;
    }

    const attributes = { attrOne: 'one', attrTwo: 'two', attrThree: 'three', attrFour: null };

    let decryptionOnlyCryptoOne: jest.Mocked<Crypto>;
    let decryptionOnlyCryptoTwo: jest.Mocked<Crypto>;
    beforeEach(() => {
      decryptionOnlyCryptoOne = createNodeCryptMock('old-key-one');
      decryptionOnlyCryptoTwo = createNodeCryptMock('old-key-two');

      service = getService(mockNodeCrypto, [decryptionOnlyCryptoOne, decryptionOnlyCryptoTwo]);
    });

    it('does not use decryption only keys if we can decrypt using primary key', async () => {
      const encryptedAttributes = await service.encryptAttributes(
        { type: 'known-type-1', id: 'object-id' },
        attributes
      );

      await expect(
        service.decryptAttributes({ type: 'known-type-1', id: 'object-id' }, encryptedAttributes)
      ).resolves.toEqual({ attrOne: 'one', attrTwo: 'two', attrThree: 'three', attrFour: null });

      expect(decryptionOnlyCryptoOne.decrypt).not.toHaveBeenCalled();
      expect(decryptionOnlyCryptoTwo.decrypt).not.toHaveBeenCalled();
    });

    it('uses decryption only keys if cannot decrypt using primary key', async () => {
      const encryptedAttributes = await getService(decryptionOnlyCryptoOne).encryptAttributes(
        { type: 'known-type-1', id: 'object-id' },
        attributes
      );

      await expect(
        service.decryptAttributes({ type: 'known-type-1', id: 'object-id' }, encryptedAttributes)
      ).resolves.toEqual({ attrOne: 'one', attrTwo: 'two', attrThree: 'three', attrFour: null });

      // One call per attributes, we have 2 of them.
      expect(mockNodeCrypto.decrypt).toHaveBeenCalledTimes(2);
      expect(decryptionOnlyCryptoOne.decrypt).toHaveBeenCalledTimes(2);
      expect(decryptionOnlyCryptoTwo.decrypt).not.toHaveBeenCalled();
    });

    it('uses all available decryption only keys if needed', async () => {
      const encryptedAttributes = await getService(decryptionOnlyCryptoTwo).encryptAttributes(
        { type: 'known-type-1', id: 'object-id' },
        attributes
      );

      await expect(
        service.decryptAttributes({ type: 'known-type-1', id: 'object-id' }, encryptedAttributes)
      ).resolves.toEqual({ attrOne: 'one', attrTwo: 'two', attrThree: 'three', attrFour: null });

      // One call per attributes, we have 2 of them.
      expect(mockNodeCrypto.decrypt).toHaveBeenCalledTimes(2);
      expect(decryptionOnlyCryptoOne.decrypt).toHaveBeenCalledTimes(2);
      expect(decryptionOnlyCryptoTwo.decrypt).toHaveBeenCalledTimes(2);
    });

    it('does not use primary encryption key if `omitPrimaryEncryptionKey` is specified', async () => {
      const encryptedAttributes = await getService(decryptionOnlyCryptoOne).encryptAttributes(
        { type: 'known-type-1', id: 'object-id' },
        attributes
      );

      await expect(
        service.decryptAttributes({ type: 'known-type-1', id: 'object-id' }, encryptedAttributes, {
          omitPrimaryEncryptionKey: true,
        })
      ).resolves.toEqual({ attrOne: 'one', attrTwo: 'two', attrThree: 'three', attrFour: null });

      // One call per attributes, we have 2 of them.
      expect(mockNodeCrypto.decrypt).not.toHaveBeenCalled();
      expect(decryptionOnlyCryptoOne.decrypt).toHaveBeenCalledTimes(2);
      expect(decryptionOnlyCryptoTwo.decrypt).not.toHaveBeenCalled();
    });
  });

  describe('without encryption key', () => {
    beforeEach(() => {
      service = new EncryptedSavedObjectsService({
        logger: loggingSystemMock.create().get(),
      });
    });

    it('does not fail if none of attributes are supposed to be decrypted', async () => {
      const attributes = { attrOne: 'one', attrTwo: 'two', attrThree: 'three' };

      service = new EncryptedSavedObjectsService({
        decryptionOnlyCryptos: [],
        logger: loggingSystemMock.create().get(),
      });
      service.registerType({ type: 'known-type-1', attributesToEncrypt: new Set(['attrFour']) });

      await expect(
        service.decryptAttributes({ type: 'known-type-1', id: 'object-id' }, attributes)
      ).resolves.toEqual({
        attrOne: 'one',
        attrTwo: 'two',
        attrThree: 'three',
      });
    });

    it('does not fail if can decrypt attributes with decryption only keys', async () => {
      const decryptionOnlyCryptoOne = createNodeCryptMock('old-key-one');
      decryptionOnlyCryptoOne.decrypt.mockImplementation(
        async (encryptedOutput: string | Buffer, aad?: string) => `${encryptedOutput}||${aad}`
      );

      service = new EncryptedSavedObjectsService({
        decryptionOnlyCryptos: [decryptionOnlyCryptoOne],
        logger: loggingSystemMock.create().get(),
      });
      service.registerType({
        type: 'known-type-1',
        attributesToEncrypt: new Set(['attrOne', 'attrThree', 'attrFour']),
      });

      const attributes = { attrOne: 'one', attrTwo: 'two', attrThree: 'three', attrFour: null };
      await expect(
        service.decryptAttributes({ type: 'known-type-1', id: 'object-id' }, attributes)
      ).resolves.toEqual({
        attrOne: 'one||["known-type-1","object-id",{"attrTwo":"two"}]',
        attrTwo: 'two',
        attrThree: 'three||["known-type-1","object-id",{"attrTwo":"two"}]',
        attrFour: null,
      });
    });

    it('fails if needs to decrypt any attribute', async () => {
      const attributes = { attrOne: 'one', attrTwo: 'two', attrThree: 'three' };

      service.registerType({ type: 'known-type-1', attributesToEncrypt: new Set(['attrOne']) });

      const mockUser = mockAuthenticatedUser();
      await expect(
        service.decryptAttributes({ type: 'known-type-1', id: 'object-id' }, attributes, {
          user: mockUser,
        })
      ).rejects.toThrowError(EncryptionError);
    });
  });
});

describe('#encryptAttributesSync', () => {
  beforeEach(() => {
    mockNodeCrypto.encryptSync.mockImplementation(
      (valueToEncrypt, aad) => `|${valueToEncrypt}|${aad}|`
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

    const encrypted = service.encryptAttributesSync(
      { type: 'known-type-1', id: 'object-id' },
      attributes
    );

    expect(removeEncryptionHeaders(encrypted)).toEqual({
      attrOne: '|one|["known-type-1","object-id",{"attrTwo":"two"}]|',
      attrTwo: 'two',
      attrThree: '|three|["known-type-1","object-id",{"attrTwo":"two"}]|',
      attrFour: null,
    });
  });

  it('encrypts only using primary crypto', async () => {
    const attributes = { attrOne: 'one', attrTwo: 'two', attrThree: 'three', attrFour: null };

    const decryptionOnlyCrypto = createNodeCryptMock('some-key');
    service = new EncryptedSavedObjectsService({
      primaryCrypto: mockNodeCrypto,
      decryptionOnlyCryptos: [decryptionOnlyCrypto],
      logger: loggingSystemMock.create().get(),
    });
    service.registerType({
      type: 'known-type-1',
      attributesToEncrypt: new Set(['attrOne', 'attrThree', 'attrFour']),
    });

    const encrypted = service.encryptAttributesSync(
      { type: 'known-type-1', id: 'object-id' },
      attributes
    );

    expect(removeEncryptionHeaders(encrypted)).toEqual({
      attrOne: '|one|["known-type-1","object-id",{"attrTwo":"two"}]|',
      attrTwo: 'two',
      attrThree: '|three|["known-type-1","object-id",{"attrTwo":"two"}]|',
      attrFour: null,
    });

    expect(decryptionOnlyCrypto.encrypt).not.toHaveBeenCalled();
    expect(decryptionOnlyCrypto.encryptSync).not.toHaveBeenCalled();
  });

  it('encrypts only attributes that are supposed to be encrypted even if not all provided', () => {
    const attributes = { attrTwo: 'two', attrThree: 'three' };

    service.registerType({
      type: 'known-type-1',
      attributesToEncrypt: new Set(['attrOne', 'attrThree']),
    });

    const encrypted = service.encryptAttributesSync(
      { type: 'known-type-1', id: 'object-id' },
      attributes
    );

    expect(removeEncryptionHeaders(encrypted)).toEqual({
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

    const encrypted = service.encryptAttributesSync(
      { type: 'known-type-1', id: 'object-id', namespace: 'object-ns' },
      attributes
    );

    expect(removeEncryptionHeaders(encrypted)).toEqual({
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

    const encrypted1 = service.encryptAttributesSync(
      { type: 'known-type-1', id: 'object-id-1' },
      knownType1attributes
    );

    expect(removeEncryptionHeaders(encrypted1)).toEqual({
      attrOne: 'one',
      attrTwo: 'two',
      attrThree: '|three|["known-type-1","object-id-1",{"attrOne":"one","attrTwo":"two"}]|',
    });

    const encrypted2 = service.encryptAttributesSync(
      { type: 'known-type-2', id: 'object-id-2' },
      knownType2attributes
    );
    expect(removeEncryptionHeaders(encrypted2)).toEqual({
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

    const encrypted = service.encryptAttributesSync(
      { type: 'known-type-1', id: 'object-id-1' },
      attributes
    );

    expect(removeEncryptionHeaders(encrypted)).toEqual({
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

  describe('without encryption key', () => {
    beforeEach(() => {
      service = new EncryptedSavedObjectsService({
        logger: loggingSystemMock.create().get(),
      });
    });

    it('does not fail if none of attributes are supposed to be encrypted', () => {
      const attributes = { attrOne: 'one', attrTwo: 'two', attrThree: 'three' };

      service.registerType({ type: 'known-type-1', attributesToEncrypt: new Set(['attrFour']) });

      expect(
        service.encryptAttributesSync({ type: 'known-type-1', id: 'object-id' }, attributes)
      ).toEqual({
        attrOne: 'one',
        attrTwo: 'two',
        attrThree: 'three',
      });
    });

    it('fails if needs to encrypt any attribute', () => {
      const attributes = { attrOne: 'one', attrTwo: 'two', attrThree: 'three' };
      service.registerType({
        type: 'known-type-1',
        attributesToEncrypt: new Set(['attrOne', 'attrThree']),
      });

      const mockUser = mockAuthenticatedUser();
      expect(() =>
        service.encryptAttributesSync({ type: 'known-type-1', id: 'object-id' }, attributes, {
          user: mockUser,
        })
      ).toThrowError(EncryptionError);

      expect(attributes).toEqual({
        attrOne: 'one',
        attrTwo: 'two',
        attrThree: 'three',
      });
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

  describe('with isTypeBeingConverted option', () => {
    it('retries decryption without namespace', () => {
      const attributes = { attrOne: 'one', attrTwo: 'two', attrThree: 'three' };

      service.registerType({
        type: 'known-type-1',
        attributesToEncrypt: new Set(['attrThree']),
      });

      const encryptedAttributes = service.encryptAttributesSync(
        { type: 'known-type-1', id: 'object-id' }, // namespace was not included in descriptor during encryption
        attributes
      );
      expect(removeEncryptionHeaders(encryptedAttributes)).toEqual({
        attrOne: 'one',
        attrTwo: 'two',
        attrThree: expect.not.stringMatching(/^three$/),
      });

      const mockUser = mockAuthenticatedUser();
      expect(
        service.decryptAttributesSync(
          { type: 'known-type-1', id: 'object-id', namespace: 'object-ns' },
          encryptedAttributes,
          { user: mockUser, isTypeBeingConverted: true }
        )
      ).toEqual({
        attrOne: 'one',
        attrTwo: 'two',
        attrThree: 'three',
      });
      expect(mockNodeCrypto.decryptSync).toHaveBeenCalledTimes(2);
      expect(mockNodeCrypto.decryptSync).toHaveBeenNthCalledWith(
        1, // first attempted to decrypt with the namespace in the descriptor (fail)
        expect.anything(),
        `["object-ns","known-type-1","object-id",{"attrOne":"one","attrTwo":"two"}]`
      );
      expect(mockNodeCrypto.decryptSync).toHaveBeenNthCalledWith(
        2, // then attempted to decrypt without the namespace in the descriptor (success)
        expect.anything(),
        `["known-type-1","object-id",{"attrOne":"one","attrTwo":"two"}]`
      );
    });

    it('retries decryption without originId (old object ID)', () => {
      const attributes = { attrOne: 'one', attrTwo: 'two', attrThree: 'three' };

      service.registerType({
        type: 'known-type-1',
        attributesToEncrypt: new Set(['attrThree']),
      });

      const encryptedAttributes = service.encryptAttributesSync(
        { type: 'known-type-1', id: 'object-id' }, // old object ID was not used in descriptor during encryption
        attributes
      );
      expect(encryptedAttributes).toEqual({
        attrOne: 'one',
        attrTwo: 'two',
        attrThree: expect.not.stringMatching(/^three$/),
      });

      const mockUser = mockAuthenticatedUser();
      expect(
        service.decryptAttributesSync(
          { type: 'known-type-1', id: 'object-id', namespace: undefined },
          encryptedAttributes,
          { user: mockUser, isTypeBeingConverted: true, originId: 'old-object-id' }
        )
      ).toEqual({
        attrOne: 'one',
        attrTwo: 'two',
        attrThree: 'three',
      });
      expect(mockNodeCrypto.decryptSync).toHaveBeenCalledTimes(2);
      expect(mockNodeCrypto.decryptSync).toHaveBeenNthCalledWith(
        1, // first attempted to decrypt with the old object ID in the descriptor (fail)
        expect.anything(),
        `["known-type-1","old-object-id",{"attrOne":"one","attrTwo":"two"}]`
      );
      expect(mockNodeCrypto.decryptSync).toHaveBeenNthCalledWith(
        2, // then attempted to decrypt with the current object ID in the descriptor (success)
        expect.anything(),
        `["known-type-1","object-id",{"attrOne":"one","attrTwo":"two"}]`
      );
    });

    it('retries decryption without namespace *and* without originId (old object ID)', () => {
      const attributes = { attrOne: 'one', attrTwo: 'two', attrThree: 'three' };

      service.registerType({
        type: 'known-type-1',
        attributesToEncrypt: new Set(['attrThree']),
      });

      const encryptedAttributes = service.encryptAttributesSync(
        { type: 'known-type-1', id: 'object-id' }, // namespace and old object ID were not used in descriptor during encryption
        attributes
      );
      expect(removeEncryptionHeaders(encryptedAttributes)).toEqual({
        attrOne: 'one',
        attrTwo: 'two',
        attrThree: expect.not.stringMatching(/^three$/),
      });

      const mockUser = mockAuthenticatedUser();
      expect(
        service.decryptAttributesSync(
          { type: 'known-type-1', id: 'object-id', namespace: 'object-ns' },
          encryptedAttributes,
          { user: mockUser, isTypeBeingConverted: true, originId: 'old-object-id' }
        )
      ).toEqual({
        attrOne: 'one',
        attrTwo: 'two',
        attrThree: 'three',
      });
      expect(mockNodeCrypto.decryptSync).toHaveBeenCalledTimes(4);
      expect(mockNodeCrypto.decryptSync).toHaveBeenNthCalledWith(
        1, // first attempted to decrypt with the old object ID and namespace in the descriptor (fail)
        expect.anything(),
        `["object-ns","known-type-1","old-object-id",{"attrOne":"one","attrTwo":"two"}]`
      );
      expect(mockNodeCrypto.decryptSync).toHaveBeenNthCalledWith(
        2, // then attempted to decrypt with the old object ID and no namespace in the descriptor (fail)
        expect.anything(),
        `["known-type-1","old-object-id",{"attrOne":"one","attrTwo":"two"}]`
      );
      expect(mockNodeCrypto.decryptSync).toHaveBeenNthCalledWith(
        3, // first attempted to decrypt with the current object ID and namespace in the descriptor (fail)
        expect.anything(),
        `["object-ns","known-type-1","object-id",{"attrOne":"one","attrTwo":"two"}]`
      );
      expect(mockNodeCrypto.decryptSync).toHaveBeenNthCalledWith(
        4, // then attempted to decrypt with the current object ID and no namespace in the descriptor (success)
        expect.anything(),
        `["known-type-1","object-id",{"attrOne":"one","attrTwo":"two"}]`
      );
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

    it('fails if retry decryption without namespace is not correct', () => {
      const attributes = { attrOne: 'one', attrTwo: 'two', attrThree: 'three' };

      encryptedAttributes = service.encryptAttributesSync(
        { type: 'known-type-1', id: 'object-id', namespace: 'some-other-ns' },
        attributes
      );
      expect(encryptedAttributes).toEqual({
        attrOne: 'one',
        attrTwo: 'two',
        attrThree: expect.not.stringMatching(/^three$/),
      });

      const mockUser = mockAuthenticatedUser();
      expect(() =>
        service.decryptAttributesSync(
          { type: 'known-type-1', id: 'object-id', namespace: 'object-ns' },
          encryptedAttributes,
          { user: mockUser, isTypeBeingConverted: true }
        )
      ).toThrowError(EncryptionError);
      expect(mockNodeCrypto.decryptSync).toHaveBeenCalledTimes(2);
      expect(mockNodeCrypto.decryptSync).toHaveBeenNthCalledWith(
        1, // first attempted to decrypt with the namespace in the descriptor (fail)
        expect.anything(),
        `["object-ns","known-type-1","object-id",{"attrOne":"one","attrTwo":"two"}]`
      );
      expect(mockNodeCrypto.decryptSync).toHaveBeenNthCalledWith(
        2, // then attempted to decrypt without the namespace in the descriptor (fail)
        expect.anything(),
        `["known-type-1","object-id",{"attrOne":"one","attrTwo":"two"}]`
      );
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
      service = new EncryptedSavedObjectsService({
        primaryCrypto: nodeCrypto({ encryptionKey: 'encryption-key-abc*' }),
        logger: loggingSystemMock.create().get(),
      });

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

  describe('with decryption only keys', () => {
    function getService(primaryCrypto: Crypto, decryptionOnlyCryptos?: Readonly<Crypto[]>) {
      const esoService = new EncryptedSavedObjectsService({
        primaryCrypto,
        decryptionOnlyCryptos,
        logger: loggingSystemMock.create().get(),
      });

      esoService.registerType({
        type: 'known-type-1',
        attributesToEncrypt: new Set(['attrOne', 'attrThree', 'attrFour']),
      });

      return esoService;
    }

    const attributes = { attrOne: 'one', attrTwo: 'two', attrThree: 'three', attrFour: null };

    let decryptionOnlyCryptoOne: jest.Mocked<Crypto>;
    let decryptionOnlyCryptoTwo: jest.Mocked<Crypto>;
    beforeEach(() => {
      decryptionOnlyCryptoOne = createNodeCryptMock('old-key-one');
      decryptionOnlyCryptoTwo = createNodeCryptMock('old-key-two');

      service = getService(mockNodeCrypto, [decryptionOnlyCryptoOne, decryptionOnlyCryptoTwo]);
    });

    it('does not use decryption only keys if we can decrypt using primary key', () => {
      const encryptedAttributes = service.encryptAttributesSync(
        { type: 'known-type-1', id: 'object-id' },
        attributes
      );

      expect(
        service.decryptAttributesSync(
          { type: 'known-type-1', id: 'object-id' },
          encryptedAttributes
        )
      ).toEqual({ attrOne: 'one', attrTwo: 'two', attrThree: 'three', attrFour: null });

      expect(decryptionOnlyCryptoOne.decryptSync).not.toHaveBeenCalled();
      expect(decryptionOnlyCryptoTwo.decryptSync).not.toHaveBeenCalled();
    });

    it('uses decryption only keys if cannot decrypt using primary key', () => {
      const encryptedAttributes = getService(decryptionOnlyCryptoOne).encryptAttributesSync(
        { type: 'known-type-1', id: 'object-id' },
        attributes
      );

      expect(
        service.decryptAttributesSync(
          { type: 'known-type-1', id: 'object-id' },
          encryptedAttributes
        )
      ).toEqual({ attrOne: 'one', attrTwo: 'two', attrThree: 'three', attrFour: null });

      // One call per attributes, we have 2 of them.
      expect(mockNodeCrypto.decryptSync).toHaveBeenCalledTimes(2);
      expect(decryptionOnlyCryptoOne.decryptSync).toHaveBeenCalledTimes(2);
      expect(decryptionOnlyCryptoTwo.decryptSync).not.toHaveBeenCalled();
    });

    it('uses all available decryption only keys if needed', () => {
      const encryptedAttributes = getService(decryptionOnlyCryptoTwo).encryptAttributesSync(
        { type: 'known-type-1', id: 'object-id' },
        attributes
      );

      expect(
        service.decryptAttributesSync(
          { type: 'known-type-1', id: 'object-id' },
          encryptedAttributes
        )
      ).toEqual({ attrOne: 'one', attrTwo: 'two', attrThree: 'three', attrFour: null });

      // One call per attributes, we have 2 of them.
      expect(mockNodeCrypto.decryptSync).toHaveBeenCalledTimes(2);
      expect(decryptionOnlyCryptoOne.decryptSync).toHaveBeenCalledTimes(2);
      expect(decryptionOnlyCryptoTwo.decryptSync).toHaveBeenCalledTimes(2);
    });

    it('does not use primary encryption key if `omitPrimaryEncryptionKey` is specified', () => {
      const encryptedAttributes = getService(decryptionOnlyCryptoOne).encryptAttributesSync(
        { type: 'known-type-1', id: 'object-id' },
        attributes
      );

      expect(
        service.decryptAttributesSync(
          { type: 'known-type-1', id: 'object-id' },
          encryptedAttributes,
          { omitPrimaryEncryptionKey: true }
        )
      ).toEqual({ attrOne: 'one', attrTwo: 'two', attrThree: 'three', attrFour: null });

      // One call per attributes, we have 2 of them.
      expect(mockNodeCrypto.decryptSync).not.toHaveBeenCalled();
      expect(decryptionOnlyCryptoOne.decryptSync).toHaveBeenCalledTimes(2);
      expect(decryptionOnlyCryptoTwo.decryptSync).not.toHaveBeenCalled();
    });
  });

  describe('without encryption key', () => {
    beforeEach(() => {
      service = new EncryptedSavedObjectsService({
        logger: loggingSystemMock.create().get(),
      });
    });

    it('does not fail if none of attributes are supposed to be decrypted', () => {
      const attributes = { attrOne: 'one', attrTwo: 'two', attrThree: 'three' };

      service = new EncryptedSavedObjectsService({
        decryptionOnlyCryptos: [],
        logger: loggingSystemMock.create().get(),
      });
      service.registerType({ type: 'known-type-1', attributesToEncrypt: new Set(['attrFour']) });

      expect(
        service.decryptAttributesSync({ type: 'known-type-1', id: 'object-id' }, attributes)
      ).toEqual({
        attrOne: 'one',
        attrTwo: 'two',
        attrThree: 'three',
      });
    });

    it('does not fail if can decrypt attributes with decryption only keys', () => {
      const decryptionOnlyCryptoOne = createNodeCryptMock('old-key-one');
      decryptionOnlyCryptoOne.decryptSync.mockImplementation(
        (encryptedOutput: string | Buffer, aad?: string) => `${encryptedOutput}||${aad}`
      );

      service = new EncryptedSavedObjectsService({
        decryptionOnlyCryptos: [decryptionOnlyCryptoOne],
        logger: loggingSystemMock.create().get(),
      });
      service.registerType({
        type: 'known-type-1',
        attributesToEncrypt: new Set(['attrOne', 'attrThree', 'attrFour']),
      });

      const attributes = { attrOne: 'one', attrTwo: 'two', attrThree: 'three', attrFour: null };
      expect(
        service.decryptAttributesSync({ type: 'known-type-1', id: 'object-id' }, attributes)
      ).toEqual({
        attrOne: 'one||["known-type-1","object-id",{"attrTwo":"two"}]',
        attrTwo: 'two',
        attrThree: 'three||["known-type-1","object-id",{"attrTwo":"two"}]',
        attrFour: null,
      });
    });

    it('fails if needs to decrypt any attribute', () => {
      const attributes = { attrOne: 'one', attrTwo: 'two', attrThree: 'three' };

      service.registerType({ type: 'known-type-1', attributesToEncrypt: new Set(['attrOne']) });

      const mockUser = mockAuthenticatedUser();
      expect(() =>
        service.decryptAttributesSync({ type: 'known-type-1', id: 'object-id' }, attributes, {
          user: mockUser,
        })
      ).toThrowError(EncryptionError);
    });
  });
});

describe('Embedding excluded AAD fields POC', () => {
  it('decrypts using embedded AAD when available', async () => {
    const attributesV2 = {
      attrOne: 'one',
      attrTwo: 'two',
      attrThree: 'three',
      attrFour: 'four',
      attrFive: 'five',
    };

    // Register an ESO model version 2.0.0 in mock Kibana V2 with additional
    // attribue "attrFour" that is excluded from AAD
    setup([
      {
        type: 'v2->v1',
        attributesToEncrypt: new Set(['attrTwo']),
        attributesToExcludeFromAAD: new Set(['attrOne', 'attrFour']),
        modelVersion: '2.0.0',
      },
    ]);

    // Registered ESO types are written as metadata SO's on
    // service.initializeVersionedMetadata() - see setup() above
    const metadataSO = {
      type: VERSIONED_ENCYRPTION_DEFINITION_TYPE,
      id: 'v2->v12.0.0',
      attributes: {
        type: 'v2->v1',
        modelVersion: '2.0.0',
        attributesToEncrypt: ['attrTwo'],
        attributesToExcludeFromAAD: ['attrOne', 'attrFour'],
      },
    };
    expect(mockSavedObjectsRepo.bulkCreate).toHaveBeenCalledTimes(1);
    expect(mockSavedObjectsRepo.bulkCreate).toHaveBeenLastCalledWith([metadataSO], {
      overwrite: true,
      managed: true,
    });

    // Encrypt type as Kibana V2 would encrypt it
    const encryptedAttributesV2 = await service.encryptAttributes(
      { type: 'v2->v1', id: 'object-id' },
      attributesV2
    );

    expect(encryptedAttributesV2).toEqual({
      attrOne: 'one',
      attrTwo: expect.stringContaining('2.0.0' + ENCRPYPTED_HEADER_EOH), // encrypyted value contains the model version (only necessary for this POC)
      attrThree: 'three',
      attrFour: 'four',
      attrFive: 'five',
    });

    // Create all new mocks and service to simulate a Kibana V1 (without registered ESO model version 2.0.0)
    // Register the same type vith model version 1.0.0 without attribute "attrFour"
    setup([
      {
        type: 'v2->v1',
        attributesToEncrypt: new Set(['attrTwo']),
        attributesToExcludeFromAAD: new Set(['attrOne']),
        modelVersion: '1.0.0', // this will cause the decyption algorthm to look at saved metadata when trying to decrypt
      },
    ]);

    // Mock the get of the saved metadata
    mockSavedObjectsRepo.get.mockResolvedValue({ ...metadataSO, references: [] });

    // The encrypted attributes contain model version 2.0.0, and will need the saved metadata to decrypt
    // In the real implementation the model version will come from the raw saved object document being
    // decrypted
    const decryptedAttributes = await service.decryptAttributes(
      { type: 'v2->v1', id: 'object-id' },
      encryptedAttributesV2
    );
    expect(mockSavedObjectsRepo.get).toHaveBeenCalledTimes(1);
    expect(mockSavedObjectsRepo.get).toHaveBeenLastCalledWith(
      VERSIONED_ENCYRPTION_DEFINITION_TYPE,
      'v2->v12.0.0'
    );

    // Decrypt should work because it will use the AAD from the metadata above (model version 2.0.0)
    // In the real implementation, as long as we have access to the raw document
    // (which contains all of V2's attributes), SW V1 can decrypt model version V2
    // with the saved metadata and then strip unknown attributes.
    // In this test, we're mocking the SO get (see above), but relying on the same decision making we
    // would have in the real implementation
    expect(decryptedAttributes).toEqual(attributesV2);
  });
});
