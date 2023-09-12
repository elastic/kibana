/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { logger } from 'elastic-apm-node';

import type { SavedObjectsModelUnsafeTransformChange } from '@kbn/core-saved-objects-server';

import { getCreateEsoModelVersion } from './create_model_version';
import type { EncryptedSavedObjectTypeRegistration } from './crypto';
import { EncryptionError, EncryptionErrorOperation } from './crypto';
import { encryptedSavedObjectsServiceMock } from './crypto/index.mock';

afterEach(() => {
  jest.clearAllMocks();
});

describe('create ESO model version', () => {
  const inputType: EncryptedSavedObjectTypeRegistration = {
    type: 'known-type-1',
    attributesToEncrypt: new Set(['firstAttr']),
  };
  const outputType: EncryptedSavedObjectTypeRegistration = {
    type: 'known-type-1',
    attributesToEncrypt: new Set(['firstAttr', 'secondAttr']),
  };
  const context = { log: logger, modelVersion: 1 };
  const encryptionSavedObjectService = encryptedSavedObjectsServiceMock.create();

  it('throws if the types are not compatible', async () => {
    const mvCreator = getCreateEsoModelVersion(encryptionSavedObjectService, () =>
      encryptedSavedObjectsServiceMock.create()
    );
    expect(() =>
      mvCreator({
        modelVersion: {
          changes: [
            {
              type: 'unsafe_transform',
              transformFn: (document) => {
                return { document };
              },
            },
          ],
        },
        inputType: {
          type: 'known-type-1',
          attributesToEncrypt: new Set(),
        },
        outputType: {
          type: 'known-type-2',
          attributesToEncrypt: new Set(),
        },
      })
    ).toThrowErrorMatchingInlineSnapshot(
      `"An Invalid Encrypted Saved Objects Model Version Transformation is trying to transform across types (\\"known-type-1\\" => \\"known-type-2\\"), which isn't permitted"`
    );
  });

  it('merges unsafe transforms', async () => {
    const instantiateServiceWithLegacyType = jest.fn(() =>
      encryptedSavedObjectsServiceMock.create()
    );

    const mvCreator = getCreateEsoModelVersion(
      encryptionSavedObjectService,
      instantiateServiceWithLegacyType
    );

    const esoModelVersion = mvCreator({
      modelVersion: {
        changes: [
          {
            type: 'unsafe_transform',
            transformFn: (document) => {
              document.attributes.one = '1';
              return { document };
            },
          },
          {
            type: 'unsafe_transform',
            transformFn: (document) => {
              document.attributes.two = '2';
              return { document: { ...document, new_prop_1: 'new prop 1' } };
            },
          },
          {
            type: 'unsafe_transform',
            transformFn: (document) => {
              document.attributes.three = '3';
              return { document };
            },
          },
          {
            type: 'unsafe_transform',
            transformFn: (document) => {
              document.attributes.four = '4';
              return { document: { ...document, new_prop_2: 'new prop 2' } };
            },
          },
        ],
      },
    });

    const attributes = {
      firstAttr: 'first_attr',
    };

    encryptionSavedObjectService.decryptAttributesSync.mockReturnValueOnce(attributes);
    encryptionSavedObjectService.encryptAttributesSync.mockReturnValueOnce(attributes);

    // There should be only one unsafe transform now
    const unsafeTransforms = esoModelVersion.changes.filter(
      (change) => change.type === 'unsafe_transform'
    ) as SavedObjectsModelUnsafeTransformChange[];
    expect(unsafeTransforms.length === 1);

    const result = unsafeTransforms[0].transformFn(
      {
        id: '123',
        type: 'known-type-1',
        namespace: 'namespace',
        attributes,
      },
      context
    );

    expect(result.document).toEqual({
      id: '123',
      type: 'known-type-1',
      namespace: 'namespace',
      new_prop_1: 'new prop 1',
      new_prop_2: 'new prop 2',
      attributes: {
        firstAttr: 'first_attr',
        one: '1',
        two: '2',
        three: '3',
        four: '4',
      },
    });
  });

  describe('transformation on an existing type', () => {
    it('uses the type in the current service for both input and output types when none are specified', async () => {
      const instantiateServiceWithLegacyType = jest.fn(() =>
        encryptedSavedObjectsServiceMock.create()
      );

      const mvCreator = getCreateEsoModelVersion(
        encryptionSavedObjectService,
        instantiateServiceWithLegacyType
      );

      const esoModelVersion = mvCreator({
        modelVersion: {
          changes: [
            {
              type: 'unsafe_transform',
              transformFn: (document) => {
                return { document };
              },
            },
          ],
        },
      });

      const attributes = {
        firstAttr: 'first_attr',
      };

      encryptionSavedObjectService.decryptAttributesSync.mockReturnValueOnce(attributes);
      encryptionSavedObjectService.encryptAttributesSync.mockReturnValueOnce(attributes);

      const unsafeTransforms = esoModelVersion.changes.filter(
        (change) => change.type === 'unsafe_transform'
      ) as SavedObjectsModelUnsafeTransformChange[];
      expect(unsafeTransforms.length === 1);
      unsafeTransforms[0].transformFn(
        {
          id: '123',
          type: 'known-type-1',
          namespace: 'namespace',
          attributes,
        },
        context
      );

      expect(encryptionSavedObjectService.decryptAttributesSync).toHaveBeenCalledWith(
        {
          id: '123',
          type: 'known-type-1',
          namespace: 'namespace',
        },
        attributes,
        { isTypeBeingConverted: false }
      );

      expect(encryptionSavedObjectService.encryptAttributesSync).toHaveBeenCalledWith(
        {
          id: '123',
          type: 'known-type-1',
          namespace: 'namespace',
        },
        attributes
      );
    });

    it('throws error on decryption failure if shouldTranformIfDecryptionFails is false', () => {
      const instantiateServiceWithLegacyType = jest.fn(() =>
        encryptedSavedObjectsServiceMock.create()
      );

      const mvCreator = getCreateEsoModelVersion(
        encryptionSavedObjectService,
        instantiateServiceWithLegacyType
      );

      const esoModelVersion = mvCreator({
        modelVersion: {
          changes: [
            {
              type: 'unsafe_transform',
              transformFn: (document) => {
                return { document };
              },
            },
          ],
        },
        shouldTransformIfDecryptionFails: false,
      });

      const attributes = {
        firstAttr: 'first_attr',
      };

      encryptionSavedObjectService.decryptAttributesSync.mockImplementationOnce(() => {
        throw new Error('decryption failed!');
      });

      const unsafeTransforms = esoModelVersion.changes.filter(
        (change) => change.type === 'unsafe_transform'
      ) as SavedObjectsModelUnsafeTransformChange[];
      expect(unsafeTransforms.length === 1);
      expect(() => {
        unsafeTransforms[0].transformFn(
          {
            id: '123',
            type: 'known-type-1',
            namespace: 'namespace',
            attributes,
          },
          context
        );
      }).toThrowError(`decryption failed!`);

      expect(encryptionSavedObjectService.decryptAttributesSync).toHaveBeenCalledWith(
        {
          id: '123',
          type: 'known-type-1',
          namespace: 'namespace',
        },
        attributes,
        { isTypeBeingConverted: false }
      );

      expect(encryptionSavedObjectService.encryptAttributesSync).not.toHaveBeenCalled();
    });

    it('throws error on decryption failure if shouldTransformIfDecryptionFails is true but error is not encryption error', () => {
      const instantiateServiceWithLegacyType = jest.fn(() =>
        encryptedSavedObjectsServiceMock.create()
      );

      const mvCreator = getCreateEsoModelVersion(
        encryptionSavedObjectService,
        instantiateServiceWithLegacyType
      );

      const esoModelVersion = mvCreator({
        modelVersion: {
          changes: [
            {
              type: 'unsafe_transform',
              transformFn: (document) => {
                return { document };
              },
            },
          ],
        },
        shouldTransformIfDecryptionFails: true,
      });

      const attributes = {
        firstAttr: 'first_attr',
      };

      encryptionSavedObjectService.decryptAttributesSync.mockImplementationOnce(() => {
        throw new Error('decryption failed!');
      });

      const unsafeTransforms = esoModelVersion.changes.filter(
        (change) => change.type === 'unsafe_transform'
      ) as SavedObjectsModelUnsafeTransformChange[];
      expect(unsafeTransforms.length === 1);
      expect(() => {
        unsafeTransforms[0].transformFn(
          {
            id: '123',
            type: 'known-type-1',
            namespace: 'namespace',
            attributes,
          },
          context
        );
      }).toThrowError(`decryption failed!`);

      expect(encryptionSavedObjectService.decryptAttributesSync).toHaveBeenCalledWith(
        {
          id: '123',
          type: 'known-type-1',
          namespace: 'namespace',
        },
        attributes,
        { isTypeBeingConverted: false }
      );

      expect(encryptionSavedObjectService.stripOrDecryptAttributesSync).not.toHaveBeenCalled();
      expect(encryptionSavedObjectService.encryptAttributesSync).not.toHaveBeenCalled();
    });

    it('executes transformation on decryption failure if shouldTransformIfDecryptionFails is true and error is encryption error', () => {
      const instantiateServiceWithLegacyType = jest.fn(() =>
        encryptedSavedObjectsServiceMock.create()
      );

      const mvCreator = getCreateEsoModelVersion(
        encryptionSavedObjectService,
        instantiateServiceWithLegacyType
      );

      const esoModelVersion = mvCreator({
        modelVersion: {
          changes: [
            {
              type: 'unsafe_transform',
              transformFn: (document) => {
                return { document };
              },
            },
          ],
        },
        shouldTransformIfDecryptionFails: true,
      });

      const attributes = {
        firstAttr: 'first_attr',
        attrToStrip: 'secret',
      };
      const strippedAttributes = {
        firstAttr: 'first_attr',
      };

      encryptionSavedObjectService.decryptAttributesSync.mockImplementationOnce(() => {
        throw new EncryptionError(
          `Unable to decrypt attribute "'attribute'"`,
          'attribute',
          EncryptionErrorOperation.Decryption,
          new Error('decryption failed')
        );
      });

      encryptionSavedObjectService.stripOrDecryptAttributesSync.mockReturnValueOnce({
        attributes: strippedAttributes,
      });

      const unsafeTransforms = esoModelVersion.changes.filter(
        (change) => change.type === 'unsafe_transform'
      ) as SavedObjectsModelUnsafeTransformChange[];
      expect(unsafeTransforms.length === 1);
      unsafeTransforms[0].transformFn(
        {
          id: '123',
          type: 'known-type-1',
          namespace: 'namespace',
          attributes,
        },
        context
      );

      expect(encryptionSavedObjectService.stripOrDecryptAttributesSync).toHaveBeenCalledWith(
        {
          id: '123',
          type: 'known-type-1',
          namespace: 'namespace',
        },
        attributes,
        { isTypeBeingConverted: false }
      );

      expect(encryptionSavedObjectService.encryptAttributesSync).toHaveBeenCalledWith(
        {
          id: '123',
          type: 'known-type-1',
          namespace: 'namespace',
        },
        strippedAttributes
      );
    });

    it('throws error on transform failure', () => {
      const instantiateServiceWithLegacyType = jest.fn(() =>
        encryptedSavedObjectsServiceMock.create()
      );

      const mvCreator = getCreateEsoModelVersion(
        encryptionSavedObjectService,
        instantiateServiceWithLegacyType
      );

      const esoModelVersion = mvCreator({
        modelVersion: {
          changes: [
            {
              type: 'unsafe_transform',
              transformFn: (document) => {
                throw new Error('transform failed!');
              },
            },
          ],
        },
      });

      const attributes = {
        firstAttr: 'first_attr',
      };

      encryptionSavedObjectService.decryptAttributesSync.mockReturnValueOnce(attributes);

      const unsafeTransforms = esoModelVersion.changes.filter(
        (change) => change.type === 'unsafe_transform'
      ) as SavedObjectsModelUnsafeTransformChange[];
      expect(unsafeTransforms.length === 1);
      expect(() => {
        unsafeTransforms[0].transformFn(
          {
            id: '123',
            type: 'known-type-1',
            namespace: 'namespace',
            attributes,
          },
          context
        );
      }).toThrowError(`transform failed!`);

      expect(encryptionSavedObjectService.decryptAttributesSync).toHaveBeenCalledWith(
        {
          id: '123',
          type: 'known-type-1',
          namespace: 'namespace',
        },
        attributes,
        { isTypeBeingConverted: false }
      );

      expect(encryptionSavedObjectService.encryptAttributesSync).not.toHaveBeenCalled();
    });

    it('throws error on tranform failure even if shouldMigrateIfDecryptionFails is true', () => {
      const instantiateServiceWithLegacyType = jest.fn(() =>
        encryptedSavedObjectsServiceMock.create()
      );

      const mvCreator = getCreateEsoModelVersion(
        encryptionSavedObjectService,
        instantiateServiceWithLegacyType
      );

      const esoModelVersion = mvCreator({
        modelVersion: {
          changes: [
            {
              type: 'unsafe_transform',
              transformFn: (document) => {
                throw new Error('transform failed!');
              },
            },
          ],
        },
        shouldTransformIfDecryptionFails: true,
      });

      const attributes = {
        firstAttr: 'first_attr',
      };

      encryptionSavedObjectService.decryptAttributesSync.mockReturnValueOnce(attributes);

      const unsafeTransforms = esoModelVersion.changes.filter(
        (change) => change.type === 'unsafe_transform'
      ) as SavedObjectsModelUnsafeTransformChange[];
      expect(unsafeTransforms.length === 1);
      expect(() => {
        unsafeTransforms[0].transformFn(
          {
            id: '123',
            type: 'known-type-1',
            namespace: 'namespace',
            attributes,
          },
          context
        );
      }).toThrowError(`transform failed!`);

      expect(encryptionSavedObjectService.decryptAttributesSync).toHaveBeenCalledWith(
        {
          id: '123',
          type: 'known-type-1',
          namespace: 'namespace',
        },
        attributes,
        { isTypeBeingConverted: false }
      );

      expect(encryptionSavedObjectService.encryptAttributesSync).not.toHaveBeenCalled();
    });

    it('throws error on encryption failure', () => {
      const instantiateServiceWithLegacyType = jest.fn(() =>
        encryptedSavedObjectsServiceMock.create()
      );

      const mvCreator = getCreateEsoModelVersion(
        encryptionSavedObjectService,
        instantiateServiceWithLegacyType
      );

      const esoModelVersion = mvCreator({
        modelVersion: {
          changes: [
            {
              type: 'unsafe_transform',
              transformFn: (document) => {
                return { document };
              },
            },
          ],
        },
      });

      const attributes = {
        firstAttr: 'first_attr',
      };

      encryptionSavedObjectService.decryptAttributesSync.mockReturnValueOnce(attributes);
      encryptionSavedObjectService.encryptAttributesSync.mockImplementationOnce(() => {
        throw new Error('encryption failed!');
      });

      const unsafeTransforms = esoModelVersion.changes.filter(
        (change) => change.type === 'unsafe_transform'
      ) as SavedObjectsModelUnsafeTransformChange[];
      expect(unsafeTransforms.length === 1);
      expect(() => {
        unsafeTransforms[0].transformFn(
          {
            id: '123',
            type: 'known-type-1',
            namespace: 'namespace',
            attributes,
          },
          context
        );
      }).toThrowError(`encryption failed!`);

      expect(encryptionSavedObjectService.decryptAttributesSync).toHaveBeenCalledWith(
        {
          id: '123',
          type: 'known-type-1',
          namespace: 'namespace',
        },
        attributes,
        { isTypeBeingConverted: false }
      );

      expect(encryptionSavedObjectService.encryptAttributesSync).toHaveBeenCalledWith(
        {
          id: '123',
          type: 'known-type-1',
          namespace: 'namespace',
        },
        attributes
      );
    });

    it('throws error on encryption failure even if shouldMigrateIfDecryptionFails is true', () => {
      const instantiateServiceWithLegacyType = jest.fn(() =>
        encryptedSavedObjectsServiceMock.create()
      );

      const mvCreator = getCreateEsoModelVersion(
        encryptionSavedObjectService,
        instantiateServiceWithLegacyType
      );

      const esoModelVersion = mvCreator({
        modelVersion: {
          changes: [
            {
              type: 'unsafe_transform',
              transformFn: (document) => {
                return { document };
              },
            },
          ],
        },
        shouldTransformIfDecryptionFails: true,
      });

      const attributes = {
        firstAttr: 'first_attr',
      };

      encryptionSavedObjectService.decryptAttributesSync.mockReturnValueOnce(attributes);
      encryptionSavedObjectService.encryptAttributesSync.mockImplementationOnce(() => {
        throw new Error('encryption failed!');
      });

      const unsafeTransforms = esoModelVersion.changes.filter(
        (change) => change.type === 'unsafe_transform'
      ) as SavedObjectsModelUnsafeTransformChange[];
      expect(unsafeTransforms.length === 1);
      expect(() => {
        unsafeTransforms[0].transformFn(
          {
            id: '123',
            type: 'known-type-1',
            namespace: 'namespace',
            attributes,
          },
          context
        );
      }).toThrowError(`encryption failed!`);

      expect(encryptionSavedObjectService.decryptAttributesSync).toHaveBeenCalledWith(
        {
          id: '123',
          type: 'known-type-1',
          namespace: 'namespace',
        },
        attributes,
        { isTypeBeingConverted: false }
      );

      expect(encryptionSavedObjectService.encryptAttributesSync).toHaveBeenCalledWith(
        {
          id: '123',
          type: 'known-type-1',
          namespace: 'namespace',
        },
        attributes
      );
    });
  });

  describe('transformation from a legacy type', () => {
    it('uses the input type for decryption', async () => {
      const serviceWithLegacyType = encryptedSavedObjectsServiceMock.create();
      const instantiateServiceWithLegacyType = jest.fn(() => serviceWithLegacyType);

      const mvCreator = getCreateEsoModelVersion(
        encryptionSavedObjectService,
        instantiateServiceWithLegacyType
      );

      const esoModelVersion = mvCreator({
        modelVersion: {
          changes: [
            {
              type: 'unsafe_transform',
              transformFn: (document) => {
                return { document };
              },
            },
          ],
        },
        inputType,
      });

      const attributes = {
        firstAttr: 'first_attr',
      };

      serviceWithLegacyType.decryptAttributesSync.mockReturnValueOnce(attributes);
      encryptionSavedObjectService.encryptAttributesSync.mockReturnValueOnce(attributes);

      const unsafeTransforms = esoModelVersion.changes.filter(
        (change) => change.type === 'unsafe_transform'
      ) as SavedObjectsModelUnsafeTransformChange[];
      expect(unsafeTransforms.length === 1);
      unsafeTransforms[0].transformFn(
        {
          id: '123',
          type: 'known-type-1',
          namespace: 'namespace',
          attributes,
        },
        context
      );

      expect(serviceWithLegacyType.decryptAttributesSync).toHaveBeenCalledWith(
        {
          id: '123',
          type: 'known-type-1',
          namespace: 'namespace',
        },
        attributes,
        { isTypeBeingConverted: false }
      );

      expect(encryptionSavedObjectService.encryptAttributesSync).toHaveBeenCalledWith(
        {
          id: '123',
          type: 'known-type-1',
          namespace: 'namespace',
        },
        attributes
      );
    });
  });

  describe('transformation across two legacy types', () => {
    const serviceWithInputLegacyType = encryptedSavedObjectsServiceMock.create();
    const serviceWithOutputLegacyType = encryptedSavedObjectsServiceMock.create();
    const instantiateServiceWithLegacyType = jest.fn();

    function createEsoMv() {
      instantiateServiceWithLegacyType
        .mockImplementationOnce(() => serviceWithInputLegacyType)
        .mockImplementationOnce(() => serviceWithOutputLegacyType);

      const mvCreator = getCreateEsoModelVersion(
        encryptionSavedObjectService,
        instantiateServiceWithLegacyType
      );

      return mvCreator({
        modelVersion: {
          changes: [
            {
              type: 'unsafe_transform',
              transformFn: (document) => {
                // modify an encrypted field
                document.attributes.firstAttr = `~~${document.attributes.firstAttr}~~`;
                // encrypt a non encrypted field if it's there
                if (document.attributes.nonEncryptedAttr) {
                  document.attributes.encryptedAttr = document.attributes.nonEncryptedAttr;
                  delete document.attributes.nonEncryptedAttr;
                }
                return { document };
              },
            },
          ],
        },
        inputType,
        outputType,
      });
    }

    it('decrypts with input type, and encrypts with output type', async () => {
      const esoMv = createEsoMv();

      expect(instantiateServiceWithLegacyType).toHaveBeenCalledWith(inputType);
      expect(instantiateServiceWithLegacyType).toHaveBeenCalledWith(outputType);

      serviceWithInputLegacyType.decryptAttributesSync.mockReturnValueOnce({
        firstAttr: 'first_attr',
        nonEncryptedAttr: 'non encrypted',
      });

      serviceWithOutputLegacyType.encryptAttributesSync.mockReturnValueOnce({
        firstAttr: `#####`,
        encryptedAttr: `#####`,
      });

      const unsafeTransforms = esoMv.changes.filter(
        (change) => change.type === 'unsafe_transform'
      ) as SavedObjectsModelUnsafeTransformChange[];
      expect(unsafeTransforms.length === 1);
      const result = unsafeTransforms[0].transformFn(
        {
          id: '123',
          type: 'known-type-1',
          namespace: 'namespace',
          attributes: {
            firstAttr: '#####',
            nonEncryptedAttr: 'non encrypted',
          },
        },
        context
      );

      expect(result.document).toMatchObject({
        id: '123',
        type: 'known-type-1',
        namespace: 'namespace',
        attributes: {
          firstAttr: '#####',
          encryptedAttr: `#####`,
        },
      });

      expect(serviceWithInputLegacyType.decryptAttributesSync).toHaveBeenCalledWith(
        {
          id: '123',
          type: 'known-type-1',
          namespace: 'namespace',
        },
        {
          firstAttr: '#####',
          nonEncryptedAttr: 'non encrypted',
        },
        { isTypeBeingConverted: false }
      );

      expect(serviceWithOutputLegacyType.encryptAttributesSync).toHaveBeenCalledWith(
        {
          id: '123',
          type: 'known-type-1',
          namespace: 'namespace',
        },
        {
          firstAttr: `~~first_attr~~`,
          encryptedAttr: 'non encrypted',
        }
      );
    });
  });
});
