/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { times } from 'lodash';
import type { SavedObject } from '@kbn/core/server';
import { elasticsearchServiceMock, savedObjectsClientMock } from '@kbn/core/server/mocks';
import { loggerMock, MockedLogger } from '@kbn/logging-mocks';
import { Installation, KibanaMiscAssetTypes } from '../../../../types';
import type { PackageInstallContext } from '../../../../../common/types';
import { auditLoggingService } from '../../../audit_logging';
import { installKibanaKnowledgeBaseEntries } from './install';
import { removeKnowledgeBaseEntries } from './remove';
import { knowledgeBaseEntrySavedObjectType } from './consts';
import { parseKnowledgeBaseEntries } from './parse_entries';
import { updateMiscAssetReferences } from '../../packages/misc_assets_reference';

jest.mock('../../../audit_logging');
jest.mock('./remove');
jest.mock('./parse_entries');
jest.mock('../../packages/misc_assets_reference');

const removeKnowledgeBaseEntriesMock = removeKnowledgeBaseEntries as jest.MockedFn<
  typeof removeKnowledgeBaseEntries
>;
const parseKnowledgeBaseEntriesMock = parseKnowledgeBaseEntries as jest.MockedFn<
  typeof parseKnowledgeBaseEntries
>;
const updateMiscAssetReferencesMock = updateMiscAssetReferences as jest.MockedFn<
  typeof updateMiscAssetReferences
>;

const mockedAuditLoggingService = auditLoggingService as jest.Mocked<typeof auditLoggingService>;

const createInstallContext = (assets: Record<string, string>): PackageInstallContext => {
  const installContext: PackageInstallContext = {
    packageInfo: {
      format_version: '3.4.0',
      name: 'test-pkg',
      title: 'Test Pkg',
      description: 'Some desc',
      version: '0.0.1',
      owner: { github: 'owner', type: 'elastic' },
    },
    assetsMap: new Map(),
    paths: [],
  };

  Object.entries(assets).forEach(([assetPath, assetContent]) => {
    installContext.paths.push(assetPath);
    installContext.assetsMap.set(assetPath, Buffer.from(assetContent));
  });

  return installContext;
};

export const createContentFile = (length = 5) => {
  return times(5)
    .map(() => '{}')
    .join('\n');
};

const createInstalledPkgObject = (parts: Partial<Installation> = {}): SavedObject<Installation> => {
  return {
    id: 'id',
    type: 'installation',
    references: [],
    attributes: {
      installed_kibana: [],
      installed_es: [],
      installed_misc: [],
      es_index_patterns: {},
      name: 'my-pkg',
      version: '0.0.1',
      install_version: '0.0.1',
      install_started_at: 'now',
      install_source: 'custom',
      install_status: 'installed',
      verification_status: 'unknown',
      ...parts,
    },
  };
};

describe('installKibanaKnowledgeBaseEntries', () => {
  let esClient: ReturnType<typeof elasticsearchServiceMock.createElasticsearchClient>;
  let savedObjectsClient: ReturnType<typeof savedObjectsClientMock.create>;
  let logger: MockedLogger;

  beforeEach(() => {
    esClient = elasticsearchServiceMock.createElasticsearchClient();
    savedObjectsClient = savedObjectsClientMock.create();
    logger = loggerMock.create();

    mockedAuditLoggingService.writeCustomSoAuditLog.mockReset();

    removeKnowledgeBaseEntriesMock.mockReset();
    parseKnowledgeBaseEntriesMock.mockReset();
    updateMiscAssetReferencesMock.mockReset();

    parseKnowledgeBaseEntriesMock.mockReturnValue([]);
  });

  it('does not call removeKnowledgeBaseEntries when the package is not installed', async () => {
    const packageInstallContext = createInstallContext({});

    await installKibanaKnowledgeBaseEntries({
      packageInstallContext,
      savedObjectsClient,
      esClient,
      logger,
      installedPkg: undefined,
    });

    expect(removeKnowledgeBaseEntriesMock).not.toHaveBeenCalled();
  });

  it('calls removeKnowledgeBaseEntries when the package is installed and has content entries', async () => {
    const packageInstallContext = createInstallContext({});
    const installedPkg = createInstalledPkgObject({
      installed_misc: [
        { type: KibanaMiscAssetTypes.knowledgeBaseEntry, id: 'foo' },
        { type: KibanaMiscAssetTypes.knowledgeBaseEntry, id: 'bar' },
      ],
    });

    await installKibanaKnowledgeBaseEntries({
      packageInstallContext,
      savedObjectsClient,
      esClient,
      logger,
      installedPkg,
    });

    expect(removeKnowledgeBaseEntriesMock).toHaveBeenCalledTimes(1);
    expect(removeKnowledgeBaseEntriesMock).toHaveBeenCalledWith({
      installedObjects: installedPkg.attributes.installed_misc,
      packageName: packageInstallContext.packageInfo.name,
      savedObjectsClient,
      esClient,
    });
  });

  it('does not call underlying methods when no knowledge base entries are present', async () => {
    parseKnowledgeBaseEntriesMock.mockReturnValue([]);

    const packageInstallContext = createInstallContext({});
    const installedPkg = createInstalledPkgObject({});

    await installKibanaKnowledgeBaseEntries({
      packageInstallContext,
      savedObjectsClient,
      esClient,
      logger,
      installedPkg,
    });

    expect(updateMiscAssetReferencesMock).not.toHaveBeenCalled();
    expect(esClient.indices.create).not.toHaveBeenCalled();
    expect(savedObjectsClient.create).not.toHaveBeenCalled();
    expect(mockedAuditLoggingService.writeCustomSoAuditLog).not.toHaveBeenCalled();
  });

  it('installs the knowledge base entries from the package', async () => {
    parseKnowledgeBaseEntriesMock.mockReturnValue([
      {
        name: 'foo',
        folderPath: 'test-pkg/kibana/knowledge_base_entry/foo',
        manifest: {
          title: 'foo',
          description: 'desc',
          index: {
            system: true,
          },
          retrieval: {
            syntactic_fields: [],
            semantic_fields: [],
          },
        },
        fields: [],
        contentFilePaths: [
          'test-pkg/kibana/knowledge_base_entry/foo/content/content-1.ndjson',
          'test-pkg/kibana/knowledge_base_entry/foo/content/content-2.ndjson',
        ],
      },
    ]);

    const packageInstallContext = createInstallContext({
      'test-pkg/kibana/knowledge_base_entry/foo/content/content-1.ndjson': createContentFile(),
      'test-pkg/kibana/knowledge_base_entry/foo/content/content-2.ndjson': createContentFile(),
    });
    const installedPkg = createInstalledPkgObject({});

    await installKibanaKnowledgeBaseEntries({
      packageInstallContext,
      savedObjectsClient,
      esClient,
      logger,
      installedPkg,
    });

    expect(esClient.indices.create).toHaveBeenCalledTimes(1);
    expect(esClient.indices.create).toHaveBeenCalledWith({
      index: '.kibana-test-pkg_foo',
      mappings: {
        dynamic: false,
        properties: {},
      },
    });

    expect(savedObjectsClient.create).toHaveBeenCalledTimes(1);
    expect(savedObjectsClient.create).toHaveBeenCalledWith(
      knowledgeBaseEntrySavedObjectType,
      {
        name: 'foo',
        type: 'index',
        description: 'desc',
      },
      { id: 'entry_test-pkg_foo' }
    );

    expect(mockedAuditLoggingService.writeCustomSoAuditLog).toHaveBeenCalledTimes(1);
    expect(mockedAuditLoggingService.writeCustomSoAuditLog).toHaveBeenCalledWith({
      action: 'create',
      id: 'entry_test-pkg_foo',
      savedObjectType: knowledgeBaseEntrySavedObjectType,
    });
  });
});
