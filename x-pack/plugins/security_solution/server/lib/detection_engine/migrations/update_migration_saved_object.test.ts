/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { savedObjectsClientMock } from '@kbn/core/server/mocks';
import { SignalsMigrationSOUpdateAttributes } from './saved_objects_schema';
import { getSignalsMigrationSavedObjectMock } from './saved_objects_schema.mock';
import { updateMigrationSavedObject } from './update_migration_saved_object';

const expectIsoDateString = expect.stringMatching(/2.*Z$/);
describe('updateMigrationSavedObject', () => {
  let partialMigration: { attributes: Partial<SignalsMigrationSOUpdateAttributes> };
  let soClient: ReturnType<typeof savedObjectsClientMock.create>;

  beforeEach(() => {
    soClient = savedObjectsClientMock.create();
    const migrationMock = getSignalsMigrationSavedObjectMock();

    partialMigration = {
      ...migrationMock,
      attributes: {
        ...migrationMock.attributes,
        destinationIndex: undefined,
        sourceIndex: undefined,
      },
    };

    // @ts-expect-error response mock is missing a few fields
    soClient.update.mockResolvedValueOnce(partialMigration);
  });

  it('returns the partial SavedObject if valid', () => {
    const { attributes } = getSignalsMigrationSavedObjectMock();

    return expect(
      updateMigrationSavedObject({ attributes, id: 'stubbed', soClient, username: 'username' })
    ).resolves.toEqual(partialMigration);
  });

  it('allows partial attributes', () => {
    const { attributes } = getSignalsMigrationSavedObjectMock();
    // @ts-expect-error intentionally breaking the type
    attributes.destinationIndex = undefined;

    return expect(
      updateMigrationSavedObject({ attributes, id: 'stubbed', soClient, username: 'username' })
    ).resolves.toEqual(partialMigration);
  });

  it('rejects if attributes are invalid', () => {
    const { attributes } = getSignalsMigrationSavedObjectMock();
    // @ts-expect-error intentionally breaking the type
    attributes.destinationIndex = null;

    return expect(
      updateMigrationSavedObject({ attributes, id: 'stubbed', soClient, username: 'username' })
    ).rejects.toThrow('Invalid value "null" supplied to "destinationIndex"');
  });

  it('updates our updated* fields', async () => {
    const { attributes } = getSignalsMigrationSavedObjectMock();

    await updateMigrationSavedObject({ id: 'my-id', attributes, soClient, username: 'username' });
    const [call] = soClient.update.mock.calls;
    const updatedAttrs = call[2];

    expect(updatedAttrs).toEqual(
      expect.objectContaining({
        updated: expectIsoDateString,
        updatedBy: 'username',
      })
    );
  });

  it('does not pass excess fields', async () => {
    const { attributes } = getSignalsMigrationSavedObjectMock();
    const attributesWithExtra = { ...attributes, extra: true };

    const result = await updateMigrationSavedObject({
      attributes: attributesWithExtra,
      id: 'stubbed',
      soClient,
      username: 'username',
    });
    expect(result).toEqual(partialMigration);

    const [call] = soClient.update.mock.calls;
    const updatedAttrs = call[2];
    const updatedKeys = Object.keys(updatedAttrs);

    expect(updatedKeys).toContain('updated');
    expect(updatedKeys).not.toContain('created');
    expect(updatedKeys).not.toContain('createdBy');
  });
});
