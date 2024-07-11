/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { Installation } from '@kbn/fleet-plugin/common';
import { ElasticsearchAssetType } from '@kbn/fleet-plugin/common';

export function isTransformUnattended(install: Installation) {
  const unattendedTransforms = install.installed_es.filter(
    (asset) => asset.type === ElasticsearchAssetType.transform && asset.id.startsWith('logs-')
  );
  return unattendedTransforms?.length > 0;
}
