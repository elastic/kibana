/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { SimpleSavedObject } from '../../../../../../../../../../../src/core/public/saved_objects/simple_saved_object';
import type { KibanaAssetType } from '../../../../../../../../common/types/models/epm';

export type AssetSavedObject = SimpleSavedObject<{ title: string; description?: string }>;

export type AllowedAssetTypes = [
  KibanaAssetType.dashboard,
  KibanaAssetType.search,
  KibanaAssetType.visualization
];

export type AllowedAssetType = AllowedAssetTypes[number] | 'view';
