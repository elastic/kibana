/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { elasticsearchServiceMock } from 'src/core/server/mocks';
import hash from 'object-hash';

import { FLEET_SERVER_INDICES } from '../../../common';

import { setupFleetServerIndexes } from './elastic_index';
import ESFleetAgentIndex from './elasticsearch/fleet_agents.json';
import ESFleetPoliciesIndex from './elasticsearch/fleet_policies.json';
import ESFleetPoliciesLeaderIndex from './elasticsearch/fleet_policies_leader.json';
import ESFleetServersIndex from './elasticsearch/fleet_servers.json';
import ESFleetEnrollmentApiKeysIndex from './elasticsearch/fleet_enrollment_api_keys.json';
import EsFleetActionsIndex from './elasticsearch/fleet_actions.json';
import EsFleetArtifactsIndex from './elasticsearch/fleet_artifacts.json';

const FLEET_INDEXES_MIGRATION_HASH: Record<typeof FLEET_SERVER_INDICES[number], string> = {
  '.fleet-actions': hash(EsFleetActionsIndex),
  '.fleet-agents': hash(ESFleetAgentIndex),
  '.fleet-artifacts': hash(EsFleetArtifactsIndex),
  '.fleet-enrollment-apy-keys': hash(ESFleetEnrollmentApiKeysIndex),
  '.fleet-policies': hash(ESFleetPoliciesIndex),
  '.fleet-policies-leader': hash(ESFleetPoliciesLeaderIndex),
  '.fleet-servers': hash(ESFleetServersIndex),
};

const getIndexList = (returnAliases: boolean = false): string[] => {
  const response = [...FLEET_SERVER_INDICES];

  if (returnAliases) {
    return response.sort();
  }

  return response.map((index) => `${index}_1`).sort();
};

describe('setupFleetServerIndexes ', () => {
  it('should create all the indices and aliases if nothings exists', async () => {
    const esMock = elasticsearchServiceMock.createInternalClient();
    await setupFleetServerIndexes(esMock);

    const indexesCreated = esMock.indices.create.mock.calls.map((call) => call[0].index).sort();
    expect(indexesCreated).toEqual(getIndexList());
    const aliasesCreated = esMock.indices.updateAliases.mock.calls
      .map((call) => (call[0].body as any)?.actions[0].add.alias)
      .sort();

    expect(aliasesCreated).toEqual(getIndexList(true));
  });

  it('should not create any indices and create aliases if indices exists but not the aliases', async () => {
    const esMock = elasticsearchServiceMock.createInternalClient();
    // @ts-expect-error
    esMock.indices.exists.mockResolvedValue({ body: true });
    // @ts-expect-error
    esMock.indices.getMapping.mockImplementation((params: { index: string }) => {
      return {
        body: {
          [params.index]: {
            mappings: {
              _meta: {
                migrationHash: FLEET_INDEXES_MIGRATION_HASH[params.index.replace(/_1$/, '')],
              },
            },
          },
        },
      };
    });

    await setupFleetServerIndexes(esMock);

    expect(esMock.indices.create).not.toBeCalled();
    const aliasesCreated = esMock.indices.updateAliases.mock.calls
      .map((call) => (call[0].body as any)?.actions[0].add.alias)
      .sort();

    expect(aliasesCreated).toEqual(getIndexList(true));
  });

  it('should put new indices mapping if the mapping has been updated ', async () => {
    const esMock = elasticsearchServiceMock.createInternalClient();
    // @ts-expect-error
    esMock.indices.exists.mockResolvedValue({ body: true });
    // @ts-expect-error
    esMock.indices.getMapping.mockImplementation((params: { index: string }) => {
      return {
        body: {
          [params.index]: {
            mappings: {
              _meta: {
                migrationHash: 'NOT_VALID_HASH',
              },
            },
          },
        },
      };
    });

    await setupFleetServerIndexes(esMock);

    expect(esMock.indices.create).not.toBeCalled();
    const indexesMappingUpdated = esMock.indices.putMapping.mock.calls
      .map((call) => call[0].index)
      .sort();

    expect(indexesMappingUpdated).toEqual(getIndexList());
  });

  it('should not create any indices or aliases if indices and aliases already exists', async () => {
    const esMock = elasticsearchServiceMock.createInternalClient();

    // @ts-expect-error
    esMock.indices.exists.mockResolvedValue({ body: true });
    // @ts-expect-error
    esMock.indices.getMapping.mockImplementation((params: { index: string }) => {
      return {
        body: {
          [params.index]: {
            mappings: {
              _meta: {
                migrationHash: FLEET_INDEXES_MIGRATION_HASH[params.index.replace(/_1$/, '')],
              },
            },
          },
        },
      };
    });
    // @ts-expect-error
    esMock.indices.existsAlias.mockResolvedValue({ body: true });

    await setupFleetServerIndexes(esMock);

    expect(esMock.indices.create).not.toBeCalled();
    expect(esMock.indices.updateAliases).not.toBeCalled();
  });
});
