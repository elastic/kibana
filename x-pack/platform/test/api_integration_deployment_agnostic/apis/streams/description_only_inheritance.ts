/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { emptyAssets, Streams } from '@kbn/streams-schema';
import type { DeploymentAgnosticFtrProviderContext } from '../../ftr_provider_context';
import { disableStreams, enableStreams, forkStream, getStream, putStream } from './helpers/requests';
import type { StreamsSupertestRepositoryClient } from './helpers/repository_client';
import { createStreamsRepositoryAdminClient } from './helpers/repository_client';

export default function ({ getService }: DeploymentAgnosticFtrProviderContext) {
  const roleScopedSupertest = getService('roleScopedSupertest');

  let apiClient: StreamsSupertestRepositoryClient;

  describe('Streams inheritance - description-only overrides', () => {
    before(async () => {
      apiClient = await createStreamsRepositoryAdminClient(roleScopedSupertest);
      await enableStreams(apiClient);
    });

    after(async () => {
      await disableStreams(apiClient);
    });

    it('does not persist type for description-only overrides and keeps inherited mappings dynamic', async () => {
      const parentName = 'logs.descriptiononlyparent';
      const childName = `${parentName}.child`;
      const fieldName = 'attributes.abc';

      // Create a parent/child hierarchy using the fork API to ensure proper routing linkage.
      await forkStream(apiClient, 'logs', { stream: { name: parentName }, where: { always: {} } });
      await forkStream(apiClient, parentName, { stream: { name: childName }, where: { always: {} } });

      // Save a description-only override on the child (no `type` should be persisted).
      const childBefore = await getStream(apiClient, childName);
      expect(Streams.WiredStream.GetResponse.is(childBefore)).to.be(true);

      const {
        name: _childStreamName,
        ingest: childIngest,
        description: childDescription,
        ..._childRest
      } = childBefore.stream;
      const { updated_at: _childProcessingUpdatedAt, ...childProcessing } = childIngest.processing;

      await putStream(apiClient, childName, {
        ...emptyAssets,
        stream: {
          description: childDescription,
          ingest: {
            ...childIngest,
            processing: childProcessing,
            wired: {
              ...childIngest.wired,
              fields: {
                ...childIngest.wired.fields,
                [fieldName]: { description: 'child custom description' },
              },
            },
          },
        },
      });

      const childAfterSave = await getStream(apiClient, childName);
      expect(Streams.WiredStream.GetResponse.is(childAfterSave)).to.be(true);

      expect(childAfterSave.stream.ingest.wired.fields).to.have.property(fieldName);
      expect(childAfterSave.stream.ingest.wired.fields[fieldName]).to.have.property(
        'description',
        'child custom description'
      );
      expect(childAfterSave.stream.ingest.wired.fields[fieldName]).not.to.have.property('type');

      // At this point, the parent does not define `abc`, so there should be no inherited mapping for it.
      expect(childAfterSave.inherited_fields).not.to.have.property(fieldName);

      // Later, the parent defines a mapping for `abc`. The child must reflect the new inherited mapping,
      // while keeping its description override without freezing the type.
      const parentBefore = await getStream(apiClient, parentName);
      expect(Streams.WiredStream.GetResponse.is(parentBefore)).to.be(true);

      const {
        name: _parentStreamName,
        ingest: parentIngest,
        description: parentDescription,
        ..._parentRest
      } = parentBefore.stream;
      const { updated_at: _parentProcessingUpdatedAt, ...parentProcessing } = parentIngest.processing;

      await putStream(apiClient, parentName, {
        ...emptyAssets,
        stream: {
          description: parentDescription,
          ingest: {
            ...parentIngest,
            processing: parentProcessing,
            wired: {
              ...parentIngest.wired,
              fields: {
                ...parentIngest.wired.fields,
                [fieldName]: { type: 'keyword' },
              },
            },
          },
        },
      });

      // Ensure ES assets are reconciled after changing an ancestor definition.
      await apiClient.fetch('POST /api/streams/_resync 2023-10-31').expect(200);

      const childAfterParentChange = await getStream(apiClient, childName);
      expect(Streams.WiredStream.GetResponse.is(childAfterParentChange)).to.be(true);

      expect(childAfterParentChange.inherited_fields).to.have.property(fieldName);
      expect(childAfterParentChange.inherited_fields[fieldName].type).to.be('keyword');
      expect(childAfterParentChange.inherited_fields[fieldName].from).to.be(parentName);

      // The child's override should still be typeless and keep its custom description.
      expect(childAfterParentChange.stream.ingest.wired.fields[fieldName]).to.have.property(
        'description',
        'child custom description'
      );
      expect(childAfterParentChange.stream.ingest.wired.fields[fieldName]).not.to.have.property('type');
    });
  });
}

