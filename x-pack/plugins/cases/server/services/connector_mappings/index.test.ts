/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { CASE_CONNECTOR_MAPPINGS_SAVED_OBJECT } from '../../../common/constants';
import type { SavedObjectsUpdateResponse } from '@kbn/core-saved-objects-api-server';
import { savedObjectsClientMock } from '@kbn/core-saved-objects-api-server-mocks';
import { loggerMock } from '@kbn/logging-mocks';
import { unset } from 'lodash';
import { ConnectorMappingsService } from '.';
import { mappings } from '../../mocks';
import type { ConnectorMappingsPersistedAttributes } from '../../common/types/connector_mappings';

describe('CaseConfigureService', () => {
  const unsecuredSavedObjectsClient = savedObjectsClientMock.create();
  const mockLogger = loggerMock.create();

  let service: ConnectorMappingsService;

  beforeEach(() => {
    jest.resetAllMocks();
    service = new ConnectorMappingsService(mockLogger);
  });

  describe('Decoding requests', () => {
    describe('post', () => {
      beforeEach(() => {
        unsecuredSavedObjectsClient.create.mockResolvedValue({
          attributes: { mappings, owner: 'cases' },
          id: '1',
          type: CASE_CONNECTOR_MAPPINGS_SAVED_OBJECT,
          references: [],
        });
      });

      it('decodes correctly the requested attributes', async () => {
        const attributes = { mappings, owner: 'cases' };

        await expect(
          service.post({
            unsecuredSavedObjectsClient,
            attributes,
            references: [],
          })
        ).resolves.not.toThrow();
      });

      it('throws if mappings is omitted', async () => {
        const attributes = { mappings, owner: 'cases' };
        unset(attributes, 'mappings');

        await expect(
          service.post({
            unsecuredSavedObjectsClient,
            attributes,
            references: [],
          })
        ).rejects.toThrow(`Invalid value "undefined" supplied to "mappings"`);
      });

      it('strips out excess attributes', async () => {
        const attributes = { mappings, owner: 'cases', foo: 'bar' };

        await expect(
          service.post({
            unsecuredSavedObjectsClient,
            attributes,
            references: [],
          })
        ).resolves.not.toThrow();

        const persistedAttributes = unsecuredSavedObjectsClient.create.mock.calls[0][1];
        expect(persistedAttributes).not.toHaveProperty('foo');
      });
    });

    describe('update', () => {
      beforeEach(() => {
        unsecuredSavedObjectsClient.update.mockResolvedValue({
          attributes: { mappings, owner: 'cases' },
        } as SavedObjectsUpdateResponse<ConnectorMappingsPersistedAttributes>);
      });

      it('decodes correctly the requested attributes', async () => {
        const updatedAttributes = { mappings, owner: 'cases' };

        await expect(
          service.update({
            mappingId: '1',
            unsecuredSavedObjectsClient,
            attributes: updatedAttributes,
            references: [],
          })
        ).resolves.not.toThrow();
      });

      it('strips out excess attributes', async () => {
        const updatedAttributes = { mappings, owner: 'cases', foo: 'bar' };

        await expect(
          service.update({
            mappingId: '1',
            unsecuredSavedObjectsClient,
            attributes: updatedAttributes,
            references: [],
          })
        ).resolves.not.toThrow();

        const persistedAttributes = unsecuredSavedObjectsClient.update.mock.calls[0][2];
        expect(persistedAttributes).not.toHaveProperty('foo');
      });
    });
  });
});
