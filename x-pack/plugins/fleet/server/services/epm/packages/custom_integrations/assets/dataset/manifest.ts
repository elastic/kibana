/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { dump } from 'js-yaml';

import { convertStringToTitle } from '../../utils';
import type { AssetOptions } from '../generate';

export const createDatasetManifest = (dataset: string, assetOptions: AssetOptions) => {
  const { format_version: formatVersion, type } = assetOptions;
  const manifest = {
    format_version: formatVersion,
    dataset,
    title: convertStringToTitle(dataset),
    type,
  };
  return dump(manifest);
};
