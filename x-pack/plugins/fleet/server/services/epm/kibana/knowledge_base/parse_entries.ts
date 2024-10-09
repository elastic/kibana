/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { load } from 'js-yaml';
import { getAssetFromAssetsMap, getPathParts } from '../../archive';
import { KibanaMiscAssetTypes } from '../../../../types';
import type { PackageInstallContext } from '../../../../../common/types';
import {
  loadKnowledgeBaseEntryFieldsFromYaml,
  processFields,
  type Fields,
} from '../../fields/field';

export const parseKnowledgeBaseEntries = (
  packageInstallContext: PackageInstallContext
): KnowledgeBaseEntryInfo[] => {
  const manifestPaths = packageInstallContext.paths.filter(isKnowledgeBaseManifest);
  return manifestPaths.map((manifestPath) => {
    return getEntryInfoFromManifestPath(manifestPath, packageInstallContext);
  });
};

interface KnowledgeBaseEntryManifest {
  title: string;
  description: string;
  index: {
    system: boolean;
  };
  retrieval: {
    syntactic_fields: string[];
    semantic_fields: string[];
  };
}

export interface KnowledgeBaseEntryInfo {
  name: string;
  folderPath: string;
  manifest: KnowledgeBaseEntryManifest;
  fields: Fields;
  contentFilePaths: string[];
}

const getEntryInfoFromManifestPath = (
  manifestPath: string,
  packageInstallContext: PackageInstallContext
): KnowledgeBaseEntryInfo => {
  const entryInfo = entryPathsFromManifestPath(manifestPath);
  const rawFields = loadKnowledgeBaseEntryFieldsFromYaml(
    packageInstallContext,
    entryInfo.entryName
  );
  const fields = processFields(rawFields);
  const contentFilePaths = packageInstallContext.paths.filter((path) =>
    path.includes(entryInfo.contentFolderPath)
  );

  const manifest: KnowledgeBaseEntryManifest = load(
    getAssetFromAssetsMap(packageInstallContext.assetsMap, manifestPath).toString()
  );

  return {
    name: entryInfo.entryName,
    folderPath: entryInfo.rootFolderPath,
    fields,
    manifest,
    contentFilePaths,
  };
};

const entryPathsFromManifestPath = (manifestPath: string) => {
  const splits = manifestPath.split('/');
  const rootFolderPath = splits.slice(0, splits.length - 1).join('/');
  const entryName = splits[splits.length - 2];
  const contentFolderPath = [rootFolderPath, 'content'].join('/');

  return {
    entryName,
    rootFolderPath,
    contentFolderPath,
  };
};

const isKnowledgeBaseManifest = (path: string): boolean => {
  //  does not support an additional level
  const pathParts = getPathParts(path);
  return (
    pathParts.service === 'kibana' &&
    pathParts.type === KibanaMiscAssetTypes.knowledgeBaseEntry &&
    pathParts.file === 'manifest.yml'
  );
};
