/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { SavedObjectUnsanitizedDoc } from '@kbn/core/server';
import { migrationMocks } from '@kbn/core/server/mocks';
import { ManifestConstants } from './common';
import { migrations, OldInternalManifestSchema } from './migrations';

describe('7.12.0 manifest migrations', () => {
  const ARTIFACT_ID_0 =
    'endpoint-exceptionlist-macos-v1-96b76a1a911662053a1562ac14c4ff1e87c2ff550d6fe52e1e0b3790526597d3';
  const ARTIFACT_ID_1 =
    'endpoint-exceptionlist-windows-v1-96b76a1a911662053a1562ac14c4ff1e87c2ff550d6fe52e1e0b3790526597d3';
  const ARTIFACT_ID_2 =
    'endpoint-trustlist-macos-v1-96b76a1a911662053a1562ac14c4ff1e87c2ff550d6fe52e1e0b3790526597d3';
  const ARTIFACT_ID_3 =
    'endpoint-trustlist-windows-v1-96b76a1a911662053a1562ac14c4ff1e87c2ff550d6fe52e1e0b3790526597d3';

  const migration = migrations['7.12.0'];

  test('Migrates ids property', () => {
    const doc: SavedObjectUnsanitizedDoc<OldInternalManifestSchema> = {
      attributes: {
        ids: [ARTIFACT_ID_0, ARTIFACT_ID_1, ARTIFACT_ID_2, ARTIFACT_ID_3],
        schemaVersion: 'v1',
        semanticVersion: '1.0.1',
      },
      id: 'endpoint-manifest-v1',
      migrationVersion: {},
      references: [],
      type: ManifestConstants.SAVED_OBJECT_TYPE,
      updated_at: '2020-06-09T20:18:20.349Z',
    };

    expect(migration(doc, migrationMocks.createContext())).toStrictEqual({
      attributes: {
        artifacts: [
          { artifactId: ARTIFACT_ID_0, policyId: undefined },
          { artifactId: ARTIFACT_ID_1, policyId: undefined },
          { artifactId: ARTIFACT_ID_2, policyId: undefined },
          { artifactId: ARTIFACT_ID_3, policyId: undefined },
        ],
        schemaVersion: 'v1',
        semanticVersion: '1.0.1',
      },
      id: 'endpoint-manifest-v1',
      migrationVersion: {},
      references: [],
      type: ManifestConstants.SAVED_OBJECT_TYPE,
      updated_at: '2020-06-09T20:18:20.349Z',
    });
  });
});
