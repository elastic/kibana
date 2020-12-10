/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { savedObjectsClientMock } from 'src/core/server/mocks';
import { signalsMigrationSOService } from './saved_objects_service';
import {
  getSavedObjectFindResponseMock,
  getSavedObjectResponseMock,
} from './saved_objects_service.mock';

const expectIsoDateString = expect.stringMatching(/2.*Z$/);
describe('signals migration SO service', () => {
  let soClient: ReturnType<typeof savedObjectsClientMock.create>;

  beforeEach(() => {
    soClient = savedObjectsClientMock.create();
  });

  describe('find()', () => {
    it('resolves an array of objects, if valid', () => {
      const migration = getSavedObjectResponseMock();
      soClient.find.mockResolvedValue(getSavedObjectFindResponseMock([{ ...migration }]));
      const client = signalsMigrationSOService(soClient);

      return expect(client.find({})).resolves.toEqual([
        expect.objectContaining(getSavedObjectResponseMock()),
      ]);
    });

    it('rejects if SO client throws', () => {
      const error = new Error('whoops');
      soClient.find.mockRejectedValue(error);
      const client = signalsMigrationSOService(soClient);

      return expect(client.find({})).rejects.toEqual(error);
    });

    it('rejects if response is invalid', () => {
      const badSavedObject = getSavedObjectResponseMock();
      // @ts-expect-error intentionally breaking the type
      badSavedObject.attributes.destinationIndex = 4;
      soClient.find.mockResolvedValue({
        total: 1,
        per_page: 1,
        page: 1,
        saved_objects: [{ ...badSavedObject, score: 0, type: '', references: [] }],
      });
      const client = signalsMigrationSOService(soClient);

      return expect(client.find({})).rejects.toThrow(
        'Invalid value "4" supplied to "attributes,destinationIndex"'
      );
    });
  });

  describe('create()', () => {
    it('returns the response if valid', () => {
      // @ts-expect-error response mock is missing a few fields
      soClient.create.mockResolvedValue(getSavedObjectResponseMock());
      const client = signalsMigrationSOService(soClient);
      const { attributes } = getSavedObjectResponseMock();

      return expect(client.create(attributes)).resolves.toEqual(getSavedObjectResponseMock());
    });

    it('rejects if attributes are invalid', () => {
      const { attributes } = getSavedObjectResponseMock();
      const client = signalsMigrationSOService(soClient);
      // @ts-expect-error intentionally breaking the type
      attributes.destinationIndex = null;

      return expect(client.create(attributes)).rejects.toThrow(
        'Invalid value "null" supplied to "destinationIndex"'
      );
    });

    it('rejects if response is invalid', () => {
      const { attributes } = getSavedObjectResponseMock();
      // @ts-expect-error intentionally breaking the type
      soClient.create.mockResolvedValue({ ...getSavedObjectResponseMock(), id: null });
      const client = signalsMigrationSOService(soClient);

      return expect(client.create(attributes)).rejects.toThrow(
        'Invalid value "null" supplied to "id"'
      );
    });

    it('does not pass excess fields', async () => {
      // @ts-expect-error response mock is missing a few fields
      soClient.create.mockResolvedValue(getSavedObjectResponseMock());
      const client = signalsMigrationSOService(soClient);
      const { attributes } = getSavedObjectResponseMock();
      const attributesWithExtra = { ...attributes, extra: true };

      const result = await client.create(attributesWithExtra);
      expect(result).toEqual(getSavedObjectResponseMock());

      const [call] = soClient.create.mock.calls;
      const attrs = call[1] as Record<string, unknown>;

      expect(Object.keys(attrs)).not.toContain('extra');
    });
  });

  describe('update()', () => {
    beforeEach(() => {
      // @ts-expect-error response mock is missing a few fields
      soClient.update.mockResolvedValue(getSavedObjectResponseMock());
    });

    it('returns the response if valid', () => {
      const client = signalsMigrationSOService(soClient);
      const { attributes } = getSavedObjectResponseMock();

      return expect(client.update('my-id', attributes)).resolves.toEqual(
        getSavedObjectResponseMock()
      );
    });

    it('rejects if attributes are invalid', () => {
      const { attributes } = getSavedObjectResponseMock();
      const client = signalsMigrationSOService(soClient);
      // @ts-expect-error intentionally breaking the type
      attributes.destinationIndex = 4;

      return expect(client.update('id', attributes)).rejects.toThrow(
        'Invalid value "4" supplied to "destinationIndex"'
      );
    });

    it('succeeds if an attribute is omitted', () => {
      const client = signalsMigrationSOService(soClient);
      const { attributes } = getSavedObjectResponseMock();
      // @ts-expect-error intentionally breaking the type
      attributes.destinationIndex = undefined;

      return expect(client.update('my-id', attributes)).resolves.toEqual(
        getSavedObjectResponseMock()
      );
    });

    it('updates our updated* fields', async () => {
      const client = signalsMigrationSOService(soClient);
      const { attributes } = getSavedObjectResponseMock();

      await client.update('my-id', attributes);
      const [call] = soClient.update.mock.calls;
      const updatedAttrs = call[2];

      expect(updatedAttrs).toEqual(
        expect.objectContaining({
          updated: expectIsoDateString,
          updatedBy: 'system',
        })
      );
    });

    it('does not pass excess fields', async () => {
      const client = signalsMigrationSOService(soClient);
      const { attributes } = getSavedObjectResponseMock();

      await client.update('my-id', attributes);
      const [call] = soClient.update.mock.calls;
      const updatedAttrs = call[2];
      const updatedKeys = Object.keys(updatedAttrs);

      expect(updatedKeys).not.toContain('created');
      expect(updatedKeys).not.toContain('createdBy');
    });
  });
});
