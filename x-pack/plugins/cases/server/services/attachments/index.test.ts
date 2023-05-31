/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { unset } from 'lodash';

import { savedObjectsClientMock } from '@kbn/core/server/mocks';
import { loggerMock } from '@kbn/logging-mocks';
import { AttachmentService } from '.';
import {
  externalReferenceAttachmentES,
  externalReferenceAttachmentESAttributes,
  externalReferenceAttachmentSO,
  externalReferenceAttachmentSOAttributes,
  externalReferenceAttachmentSOAttributesWithoutRefs,
  createPersistableStateAttachmentTypeRegistryMock,
  persistableStateAttachment,
  persistableStateAttachmentAttributes,
  persistableStateAttachmentAttributesWithoutInjectedId,
} from '../../attachment_framework/mocks';
import { createAlertAttachment, createErrorSO, createUserAttachment } from './test_utils';
import { CommentType } from '../../../common';
import { createSOFindResponse } from '../test_utils';

describe('AttachmentService', () => {
  const unsecuredSavedObjectsClient = savedObjectsClientMock.create();
  const mockLogger = loggerMock.create();
  const persistableStateAttachmentTypeRegistry = createPersistableStateAttachmentTypeRegistryMock();
  let service: AttachmentService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new AttachmentService({
      log: mockLogger,
      persistableStateAttachmentTypeRegistry,
      unsecuredSavedObjectsClient,
    });
  });

  describe('create', () => {
    describe('Decoding', () => {
      it('does not throw when the response has the required fields', async () => {
        unsecuredSavedObjectsClient.create.mockResolvedValue(createUserAttachment());

        await expect(
          service.create({
            attributes: createUserAttachment().attributes,
            references: [],
            id: '1',
          })
        ).resolves.not.toThrow();
      });

      it('strips excess fields', async () => {
        unsecuredSavedObjectsClient.create.mockResolvedValue(createUserAttachment({ foo: 'bar' }));

        const res = await service.create({
          attributes: createUserAttachment().attributes,
          references: [],
          id: '1',
        });

        expect(res).toStrictEqual(createUserAttachment());
      });

      it('throws when the response is missing the attributes.comment', async () => {
        const invalidAttachment = createUserAttachment();
        unset(invalidAttachment, 'attributes.comment');

        unsecuredSavedObjectsClient.create.mockResolvedValue(invalidAttachment);

        await expect(
          service.create({
            attributes: createUserAttachment().attributes,
            references: [],
            id: '1',
          })
        ).rejects.toThrowErrorMatchingInlineSnapshot(
          `"Invalid value \\"undefined\\" supplied to \\"comment\\",Invalid value \\"user\\" supplied to \\"type\\",Invalid value \\"undefined\\" supplied to \\"alertId\\",Invalid value \\"undefined\\" supplied to \\"index\\",Invalid value \\"undefined\\" supplied to \\"rule\\",Invalid value \\"undefined\\" supplied to \\"actions\\",Invalid value \\"undefined\\" supplied to \\"externalReferenceAttachmentTypeId\\",Invalid value \\"undefined\\" supplied to \\"externalReferenceMetadata\\",Invalid value \\"undefined\\" supplied to \\"externalReferenceId\\",Invalid value \\"undefined\\" supplied to \\"externalReferenceStorage\\",Invalid value \\"undefined\\" supplied to \\"persistableStateAttachmentTypeId\\",Invalid value \\"undefined\\" supplied to \\"persistableStateAttachmentState\\""`
        );
      });
    });
  });

  describe('bulkCreate', () => {
    describe('Decoding', () => {
      it('does not throw when the response has the required fields', async () => {
        unsecuredSavedObjectsClient.bulkCreate.mockResolvedValue({
          saved_objects: [createUserAttachment()],
        });

        await expect(
          service.bulkCreate({
            attachments: [
              { attributes: createUserAttachment().attributes, references: [], id: '1' },
            ],
          })
        ).resolves.not.toThrow();
      });

      it('returns error objects unmodified', async () => {
        const userAttachment = createUserAttachment({ foo: 'bar' });

        const errorResponseObj = createErrorSO();

        unsecuredSavedObjectsClient.bulkCreate.mockResolvedValue({
          saved_objects: [errorResponseObj, userAttachment],
        });

        const res = await service.bulkCreate({
          attachments: [
            { attributes: createUserAttachment().attributes, references: [], id: '1' },
            { attributes: createUserAttachment().attributes, references: [], id: '1' },
          ],
        });

        expect(res).toStrictEqual({ saved_objects: [errorResponseObj, createUserAttachment()] });
      });

      it('strips excess fields', async () => {
        unsecuredSavedObjectsClient.bulkCreate.mockResolvedValue({
          saved_objects: [createUserAttachment({ foo: 'bar' })],
        });

        const res = await service.bulkCreate({
          attachments: [{ attributes: createUserAttachment().attributes, references: [], id: '1' }],
        });

        expect(res).toStrictEqual({ saved_objects: [createUserAttachment()] });
      });

      it('throws when the response is missing the attributes.comment field', async () => {
        const invalidAttachment = createUserAttachment();
        unset(invalidAttachment, 'attributes.comment');

        unsecuredSavedObjectsClient.bulkCreate.mockResolvedValue({
          saved_objects: [invalidAttachment],
        });

        await expect(
          service.bulkCreate({
            attachments: [
              { attributes: createUserAttachment().attributes, references: [], id: '1' },
            ],
          })
        ).rejects.toThrowErrorMatchingInlineSnapshot(
          `"Invalid value \\"undefined\\" supplied to \\"comment\\",Invalid value \\"user\\" supplied to \\"type\\",Invalid value \\"undefined\\" supplied to \\"alertId\\",Invalid value \\"undefined\\" supplied to \\"index\\",Invalid value \\"undefined\\" supplied to \\"rule\\",Invalid value \\"undefined\\" supplied to \\"actions\\",Invalid value \\"undefined\\" supplied to \\"externalReferenceAttachmentTypeId\\",Invalid value \\"undefined\\" supplied to \\"externalReferenceMetadata\\",Invalid value \\"undefined\\" supplied to \\"externalReferenceId\\",Invalid value \\"undefined\\" supplied to \\"externalReferenceStorage\\",Invalid value \\"undefined\\" supplied to \\"persistableStateAttachmentTypeId\\",Invalid value \\"undefined\\" supplied to \\"persistableStateAttachmentState\\""`
        );
      });
    });
  });

  describe('update', () => {
    const soClientRes = {
      id: '1',
      attributes: persistableStateAttachmentAttributesWithoutInjectedId,
      references: [],
      version: 'test',
      type: 'cases-comments',
    };

    it('should inject the references to the attributes correctly (persistable state)', async () => {
      unsecuredSavedObjectsClient.update.mockResolvedValue(soClientRes);

      const res = await service.update({
        attachmentId: '1',
        updatedAttributes: persistableStateAttachment,
        options: { references: [] },
      });

      expect(res).toEqual({ ...soClientRes, attributes: persistableStateAttachmentAttributes });
    });

    it('should inject the references to the attributes correctly (external reference savedObject)', async () => {
      unsecuredSavedObjectsClient.update.mockResolvedValue({
        ...soClientRes,
        attributes: externalReferenceAttachmentSOAttributesWithoutRefs,
      });

      const res = await service.update({
        attachmentId: '1',
        updatedAttributes: externalReferenceAttachmentSO,
        options: { references: [] },
      });

      expect(res).toEqual({ ...soClientRes, attributes: externalReferenceAttachmentSOAttributes });
    });

    it('should inject the references to the attributes correctly (external reference elasticSearchDoc)', async () => {
      unsecuredSavedObjectsClient.update.mockResolvedValue({
        ...soClientRes,
        attributes: externalReferenceAttachmentESAttributes,
      });

      const res = await service.update({
        attachmentId: '1',
        updatedAttributes: externalReferenceAttachmentES,
        options: { references: [] },
      });

      expect(res).toEqual({ ...soClientRes, attributes: externalReferenceAttachmentESAttributes });
    });

    describe('Decoding', () => {
      it('does not throw when the response has the required fields', async () => {
        unsecuredSavedObjectsClient.update.mockResolvedValue(createUserAttachment());

        await expect(
          service.update({
            updatedAttributes: { comment: 'yes', type: CommentType.user, owner: 'hi' },
            attachmentId: '1',
          })
        ).resolves.not.toThrow();
      });

      it('strips excess fields', async () => {
        unsecuredSavedObjectsClient.update.mockResolvedValue(createUserAttachment({ foo: 'bar' }));

        const res = await service.update({
          updatedAttributes: { comment: 'yes', type: CommentType.user, owner: 'hi' },
          attachmentId: '1',
        });

        expect(res).toStrictEqual(createUserAttachment());
      });

      it('throws when the response is missing the attributes.rule.name', async () => {
        const invalidAttachment = createAlertAttachment();
        unset(invalidAttachment, 'attributes.rule.name');

        unsecuredSavedObjectsClient.update.mockResolvedValue(invalidAttachment);

        await expect(
          service.update({
            updatedAttributes: createUserAttachment().attributes,
            attachmentId: '1',
          })
        ).rejects.toThrowErrorMatchingInlineSnapshot(
          `"Invalid value \\"alert\\" supplied to \\"type\\",Invalid value \\"undefined\\" supplied to \\"rule,name\\""`
        );
      });
    });
  });

  describe('bulkUpdate', () => {
    const soClientRes = {
      id: '1',
      attributes: persistableStateAttachmentAttributesWithoutInjectedId,
      references: [],
      version: 'test',
      type: 'cases-comments',
    };

    it('should inject the references to the attributes correctly (persistable state)', async () => {
      unsecuredSavedObjectsClient.bulkUpdate.mockResolvedValue({
        saved_objects: [
          soClientRes,
          {
            ...soClientRes,
            attributes: externalReferenceAttachmentSOAttributesWithoutRefs,
          },
          {
            ...soClientRes,
            attributes: externalReferenceAttachmentESAttributes,
          },
        ],
      });

      const res = await service.bulkUpdate({
        comments: [
          {
            attachmentId: '1',
            updatedAttributes: persistableStateAttachment,
            options: { references: [] },
          },
          {
            attachmentId: '2',
            updatedAttributes: externalReferenceAttachmentSO,
            options: { references: [] },
          },
          {
            attachmentId: '3',
            updatedAttributes: externalReferenceAttachmentES,
            options: { references: [] },
          },
        ],
      });

      expect(res).toEqual({
        saved_objects: [
          { ...soClientRes, attributes: persistableStateAttachmentAttributes },
          { ...soClientRes, attributes: externalReferenceAttachmentSOAttributes },
          { ...soClientRes, attributes: externalReferenceAttachmentESAttributes },
        ],
      });
    });

    describe('Decoding', () => {
      it('does not throw when the response has the required fields', async () => {
        unsecuredSavedObjectsClient.bulkUpdate.mockResolvedValue({
          saved_objects: [createUserAttachment()],
        });

        const updatedAttributes = createUserAttachment().attributes;

        await expect(
          service.bulkUpdate({ comments: [{ attachmentId: '1', updatedAttributes }] })
        ).resolves.not.toThrow();
      });

      it('returns error objects unmodified', async () => {
        const userAttachment = createUserAttachment({ foo: 'bar' });

        const errorResponseObj = createErrorSO();

        unsecuredSavedObjectsClient.bulkUpdate.mockResolvedValue({
          saved_objects: [errorResponseObj, userAttachment],
        });

        const res = await service.bulkUpdate({
          comments: [
            { attachmentId: '1', updatedAttributes: userAttachment.attributes },
            { attachmentId: '1', updatedAttributes: userAttachment.attributes },
          ],
        });

        expect(res).toStrictEqual({ saved_objects: [errorResponseObj, createUserAttachment()] });
      });

      it('strips excess fields', async () => {
        const updatedAttributes = createUserAttachment().attributes;

        unsecuredSavedObjectsClient.bulkUpdate.mockResolvedValue({
          saved_objects: [createUserAttachment({ foo: 'bar' })],
        });

        const res = await service.bulkUpdate({
          comments: [{ attachmentId: '1', updatedAttributes }],
        });

        expect(res).toStrictEqual({ saved_objects: [createUserAttachment()] });
      });

      it('throws when the response is missing the attributes.rule.name field', async () => {
        const invalidAttachment = createAlertAttachment();
        unset(invalidAttachment, 'attributes.rule.name');

        unsecuredSavedObjectsClient.bulkUpdate.mockResolvedValue({
          saved_objects: [invalidAttachment],
        });

        const updatedAttributes = createAlertAttachment().attributes;

        await expect(
          service.bulkUpdate({ comments: [{ attachmentId: '1', updatedAttributes }] })
        ).rejects.toThrowErrorMatchingInlineSnapshot(
          `"Invalid value \\"alert\\" supplied to \\"type\\",Invalid value \\"undefined\\" supplied to \\"rule,name\\""`
        );
      });
    });
  });

  describe('find', () => {
    describe('Decoding', () => {
      it('does not throw when the response has the required fields', async () => {
        unsecuredSavedObjectsClient.find.mockResolvedValue(
          createSOFindResponse([{ ...createUserAttachment(), score: 0 }])
        );

        await expect(service.find({})).resolves.not.toThrow();
      });

      it('strips excess fields', async () => {
        unsecuredSavedObjectsClient.find.mockResolvedValue(
          createSOFindResponse([{ ...createUserAttachment({ foo: 'bar' }), score: 0 }])
        );

        const res = await service.find({});

        expect(res).toStrictEqual(createSOFindResponse([{ ...createUserAttachment(), score: 0 }]));
      });

      it('throws when the response is missing the attributes.rule.name field', async () => {
        const invalidAttachment = createUserAttachment();
        unset(invalidAttachment, 'attributes.comment');

        unsecuredSavedObjectsClient.find.mockResolvedValue(
          createSOFindResponse([{ ...invalidAttachment, score: 0 }])
        );

        await expect(service.find({})).rejects.toThrowErrorMatchingInlineSnapshot(
          `"Invalid value \\"undefined\\" supplied to \\"comment\\",Invalid value \\"user\\" supplied to \\"type\\",Invalid value \\"undefined\\" supplied to \\"alertId\\",Invalid value \\"undefined\\" supplied to \\"index\\",Invalid value \\"undefined\\" supplied to \\"rule\\",Invalid value \\"undefined\\" supplied to \\"actions\\",Invalid value \\"undefined\\" supplied to \\"externalReferenceAttachmentTypeId\\",Invalid value \\"undefined\\" supplied to \\"externalReferenceMetadata\\",Invalid value \\"undefined\\" supplied to \\"externalReferenceId\\",Invalid value \\"undefined\\" supplied to \\"externalReferenceStorage\\",Invalid value \\"undefined\\" supplied to \\"persistableStateAttachmentTypeId\\",Invalid value \\"undefined\\" supplied to \\"persistableStateAttachmentState\\""`
        );
      });
    });
  });
});
