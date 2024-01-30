/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { logger } from 'elastic-apm-node';

import type {
  SavedObjectModelTransformationContext,
  SavedObjectsModelUnsafeTransformChange,
} from '@kbn/core-saved-objects-server';

import { getCreateEsoModelVersion } from './create_model_version';
import type { EncryptedSavedObjectTypeRegistration } from './crypto';
import { EncryptionError, EncryptionErrorOperation } from './crypto';
import { encryptedSavedObjectsServiceMock } from './crypto/index.mock';

describe('create ESO model version', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  const inputType: EncryptedSavedObjectTypeRegistration = {
    type: 'known-type-1',
    attributesToEncrypt: new Set(['firstAttr']),
  };
  const outputType: EncryptedSavedObjectTypeRegistration = {
    type: 'known-type-1',
    attributesToEncrypt: new Set(['firstAttr', 'secondAttr']),
  };
  const context: SavedObjectModelTransformationContext = {
    log: logger,
    modelVersion: 1,
    namespaceType: 'single',
  };
  const encryptionSavedObjectService = encryptedSavedObjectsServiceMock.create();

  it('throws if the types are not compatible', () => {
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
      `"An invalid Encrypted Saved Objects Model Version transformation is trying to transform across types (\\"known-type-1\\" => \\"known-type-2\\"), which isn't permitted"`
    );
  });

  it('throws if there are no changes defined', () => {
    const mvCreator = getCreateEsoModelVersion(encryptionSavedObjectService, () =>
      encryptedSavedObjectsServiceMock.create()
    );
    expect(() =>
      mvCreator({
        modelVersion: {
          changes: [],
        },
        inputType,
        outputType,
      })
    ).toThrowErrorMatchingInlineSnapshot(
      `"No Model Version changes defined. At least one change is required to create an Encrypted Saved Objects Model Version."`
    );
  });

  it('merges all applicable transforms', () => {
    const instantiateServiceWithLegacyType = jest.fn(() => encryptionSavedObjectService);

    const mvCreator = getCreateEsoModelVersion(
      encryptionSavedObjectService,
      instantiateServiceWithLegacyType
    );

    const esoModelVersion = mvCreator({
      modelVersion: {
        // changes include at least one of each supported transform type in an interleaved order
        // (we're not concerned with mapping changes here)
        changes: [
          {
            type: 'unsafe_transform',
            transformFn: (document) => {
              document.attributes.three = '3';
              return { document };
            },
          },
          {
            type: 'data_removal',
            removedAttributePaths: ['firstAttr'],
          },
          {
            type: 'unsafe_transform',
            transformFn: (document) => {
              document.attributes.two = '2';
              return { document: { ...document, new_prop_1: 'new prop 1' } };
            },
          },
          {
            type: 'data_backfill',
            backfillFn: () => {
              return { attributes: { one: '1' } };
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
      inputType,
      outputType,
    });

    const initialAttributes = {
      firstAttr: 'first_attr',
    };

    const expectedAttributes = {
      one: '1',
      two: '2',
      three: '3',
      four: '4',
    };

    encryptionSavedObjectService.decryptAttributesSync.mockReturnValueOnce(initialAttributes);
    encryptionSavedObjectService.encryptAttributesSync.mockReturnValueOnce(expectedAttributes);

    // There should be only one change now
    expect(esoModelVersion.changes.length === 1);

    // It should be a single unsafe transform
    const unsafeTransforms = esoModelVersion.changes.filter(
      (change) => change.type === 'unsafe_transform'
    ) as SavedObjectsModelUnsafeTransformChange[];
    expect(unsafeTransforms.length === 1);

    const result = unsafeTransforms[0].transformFn(
      {
        id: '123',
        type: 'known-type-1',
        namespace: 'namespace',
        attributes: initialAttributes,
      },
      context
    );

    // This is the major part of the test. Did the encrypt function get called with
    // the attributes updated by all of the transform functions.
    expect(encryptionSavedObjectService.encryptAttributesSync).toBeCalledTimes(1);
    expect(encryptionSavedObjectService.encryptAttributesSync).toHaveBeenCalledWith(
      {
        id: '123',
        type: 'known-type-1',
        namespace: 'namespace',
      },
      expectedAttributes
    );

    expect(result).toEqual({
      document: {
        id: '123',
        type: 'known-type-1',
        namespace: 'namespace',
        new_prop_1: 'new prop 1', // added by unsafe transform
        new_prop_2: 'new prop 2', // added by unsafe transform
        attributes: expectedAttributes,
      },
    });
  });

  it('throws error on decryption failure if shouldTransformIfDecryptionFails is false', () => {
    const instantiateServiceWithLegacyType = jest.fn(() => encryptionSavedObjectService);

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
      outputType,
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
    const instantiateServiceWithLegacyType = jest.fn(() => encryptionSavedObjectService);

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
      outputType,
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
    const instantiateServiceWithLegacyType = jest.fn(() => encryptionSavedObjectService);

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
      outputType,
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
    const instantiateServiceWithLegacyType = jest.fn(() => encryptionSavedObjectService);

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
      inputType,
      outputType,
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

  it('throws error on transform failure even if shouldMigrateIfDecryptionFails is true', () => {
    const instantiateServiceWithLegacyType = jest.fn(() => encryptionSavedObjectService);

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
      inputType,
      outputType,
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
    const instantiateServiceWithLegacyType = jest.fn(() => encryptionSavedObjectService);

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
      outputType,
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
    const instantiateServiceWithLegacyType = jest.fn(() => encryptionSavedObjectService);

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
      outputType,
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

  it('decrypts with input type, and encrypts with output type', () => {
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

    expect(result).toMatchObject({
      document: {
        id: '123',
        type: 'known-type-1',
        namespace: 'namespace',
        attributes: {
          firstAttr: '#####',
          encryptedAttr: `#####`,
        },
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
