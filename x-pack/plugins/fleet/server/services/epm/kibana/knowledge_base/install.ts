/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { BulkRequest } from '@elastic/elasticsearch/lib/api/types';
import type {
  ElasticsearchClient,
  SavedObject,
  SavedObjectsClientContract,
  Logger,
} from '@kbn/core/server';
import { getAssetFromAssetsMap } from '../../archive';
import { KibanaMiscAssetTypes } from '../../../../types';
import type { Installation, KnowledgeBaseMiscAssetReference } from '../../../../types';
import type { MiscAssetReference, PackageInstallContext } from '../../../../../common/types';
import { updateMiscAssetReferences } from '../../packages/misc_assets_reference';
import { parseKnowledgeBaseEntries, type KnowledgeBaseEntryInfo } from './parse_entries';
import { generateMappings } from '../../elasticsearch/template/template';
import { getSavedObjectId, getIndexName } from './utils';
import { knowledgeBaseEntrySavedObjectType } from './consts';
import { removeKnowledgeBaseEntries } from './remove';

interface InstallKibanaKnowledgeBaseEntriesOptions {
  packageInstallContext: PackageInstallContext;
  savedObjectsClient: SavedObjectsClientContract;
  esClient: ElasticsearchClient;
  logger: Logger;
  installedPkg?: SavedObject<Installation>;
}

export async function installKibanaKnowledgeBaseEntries(
  options: InstallKibanaKnowledgeBaseEntriesOptions
): Promise<MiscAssetReference[]> {
  const { packageInstallContext, installedPkg, savedObjectsClient, esClient } = options;

  if (installedPkg?.attributes.installed_misc?.length) {
    await removeKnowledgeBaseEntries({
      installedObjects: installedPkg.attributes.installed_misc,
      packageName: packageInstallContext.packageInfo.name,
      savedObjectsClient,
      esClient,
    });
  }

  const entries = parseKnowledgeBaseEntries(packageInstallContext);
  if (entries.length === 0) {
    return [];
  }

  const references: KnowledgeBaseMiscAssetReference[] = entries.map((entry) => {
    return {
      id: entry.name,
      type: KibanaMiscAssetTypes.knowledgeBaseEntry,
      system: entry.manifest.index?.system ?? true,
    };
  });

  await updateMiscAssetReferences(
    savedObjectsClient,
    packageInstallContext.packageInfo.name,
    installedPkg?.attributes.installed_misc ?? [],
    {
      assetsToAdd: references,
    }
  );

  for (let i = 0; i < entries.length; i++) {
    const entry = entries[i];
    await installKibanaKnowledgeBaseEntry(entry, options);
  }

  return references;
}

async function installKibanaKnowledgeBaseEntry(
  entry: KnowledgeBaseEntryInfo,
  options: InstallKibanaKnowledgeBaseEntriesOptions
) {
  const { packageInstallContext, esClient, savedObjectsClient } = options;

  // create the index
  const indexName = getIndexName({
    system: entry.manifest.index?.system ?? false,
    entryName: entry.name,
    packageName: packageInstallContext.packageInfo.name,
  });
  const { properties: mappingProperties } = generateMappings(entry.fields);
  await esClient.indices.create({
    index: indexName,
    mappings: {
      dynamic: false,
      properties: mappingProperties,
    },
  });

  // populate the index
  for (const contentFilePath of entry.contentFilePaths) {
    await indexContentFile({
      indexName,
      esClient,
      contentBuffer: getAssetFromAssetsMap(packageInstallContext.assetsMap, contentFilePath),
    });
  }

  // create the saved object entry
  const savedObjectId = getSavedObjectId({
    entryName: entry.name,
    packageName: packageInstallContext.packageInfo.name,
  });
  await savedObjectsClient.create(
    knowledgeBaseEntrySavedObjectType,
    {
      // TODO: update the props to the full set once the KB PR has been merged
      name: entry.manifest.title,
      type: 'index',
      description: entry.manifest.description,
    },
    { id: savedObjectId }
  );
}

const indexContentFile = async ({
  indexName,
  contentBuffer,
  esClient,
}: {
  indexName: string;
  contentBuffer: Buffer;
  esClient: ElasticsearchClient;
}) => {
  const fileContent = contentBuffer.toString('utf-8');
  const lines = fileContent.split('\n');

  const documents = lines
    .map((line) => line.trim())
    .filter((line) => line.length > 0)
    .map((line) => {
      return JSON.parse(line);
    });

  const operations = documents.reduce((ops, document) => {
    ops!.push(...[{ index: { _index: indexName } }, document]);
    return ops;
  }, [] as BulkRequest['operations']);

  await esClient.bulk({
    refresh: false,
    operations,
  });
};
