/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { setTimeout } from 'timers/promises';
import type { BulkRequest } from '@elastic/elasticsearch/lib/api/types';
import type {
  ElasticsearchClient,
  SavedObject,
  SavedObjectsBulkCreateObject,
  SavedObjectsClientContract,
  ISavedObjectsImporter,
  SavedObjectsImportSuccess,
  SavedObjectsImportFailure,
  Logger,
} from '@kbn/core/server';
import { createListStream } from '@kbn/utils';
import { partition, chunk } from 'lodash';

import { load } from 'js-yaml';
import { getAssetFromAssetsMap, getPathParts } from '../../archive';
import { KibanaAssetType, KibanaSavedObjectType, KibanaMiscAssetTypes } from '../../../../types';
import type { AssetReference, Installation, PackageSpecTags } from '../../../../types';
import type { MiscAssetReference, PackageInstallContext } from '../../../../../common/types';
import {
  indexPatternTypes,
  getIndexPatternSavedObjects,
  makeManagedIndexPatternsGlobal,
} from '../index_pattern/install';
import { kibanaAssetsToAssetsRef, saveKibanaAssetsRefs } from '../../packages/install';
import { deleteKibanaSavedObjectsAssets } from '../../packages/remove';
import { FleetError, KibanaSOReferenceError } from '../../../../errors';
import { withPackageSpan } from '../../packages/utils';
import { loadKnowledgeBaseEntryFieldsFromYaml, processFields, Fields } from '../../fields/field';
import { tagKibanaAssets } from './tag_assets';
import { getSpaceAwareSaveobjectsClients } from './saved_objects';
import { updateMiscAssetReferences } from '../../packages/misc_assets_reference';
import { parseKnowledgeBaseEntries, type KnowledgeBaseEntryInfo } from './parse_entries';
import { generateMappings } from '../../elasticsearch/template/template';

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
  const { packageInstallContext } = options;

  const entries = parseKnowledgeBaseEntries(packageInstallContext);

  // TODO: store on installation before install
  // AssetReference
  // updateMiscAssetReferences

  for (let i = 0; i < entries.length; i++) {
    const entry = entries[i];
    await installKibanaKnowledgeBaseEntry(entry, options);
  }
  // TODO: return values
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
    'knowledge_base_entry',
    {
      name: entry.manifest.name,
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
  const documents = lines.map((line) => {
    return JSON.parse(line.trim());
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

const getIndexName = ({
  entryName,
  packageName,
  system,
}: {
  packageName: string;
  system: boolean;
  entryName: string;
}): string => {
  const prefix = system ? '.kibana-' : '';
  return `${prefix}${packageName}_${entryName}`;
};

const getSavedObjectId = ({
  entryName,
  packageName,
}: {
  packageName: string;
  entryName: string;
}): string => {
  return `entry_${packageName}_${entryName}`;
};
