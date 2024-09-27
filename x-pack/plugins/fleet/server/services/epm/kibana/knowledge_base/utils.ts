/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  KibanaMiscAssetTypes,
  type AssetReference,
  type KnowledgeBaseMiscAssetReference,
} from '../../../../types';

export const getIndexName = ({
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

export const getSavedObjectId = ({
  entryName,
  packageName,
}: {
  packageName: string;
  entryName: string;
}): string => {
  return `entry_${packageName}_${entryName}`;
};

export function isKnowledgeBaseEntryReference(
  reference: AssetReference
): reference is KnowledgeBaseMiscAssetReference {
  return reference.type === KibanaMiscAssetTypes.knowledgeBaseEntry;
}
