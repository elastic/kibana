/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { USER_SETTINGS_TEMPLATE_SUFFIX, PACKAGE_TEMPLATE_SUFFIX } from '../constants';

/**
 * Creates the base name for Elasticsearch assets in the form of
 * {type}-{dataset}
 */
export function getRegistryDataStreamAssetBaseName(dataStream: {
  dataset: string;
  type: string;
  hidden?: boolean;
}): string {
  const baseName = `${dataStream.type}-${dataStream.dataset}`;
  return dataStream.hidden ? `.${baseName}` : baseName;
}

/**
 * Return the name for a component template
 */
export function getComponentTemplateNameForDatastream(
  dataStream: {
    dataset: string;
    type: string;
    hidden?: boolean;
  },
  suffix?: typeof PACKAGE_TEMPLATE_SUFFIX | typeof USER_SETTINGS_TEMPLATE_SUFFIX
): string {
  return `${getRegistryDataStreamAssetBaseName(dataStream)}${suffix ?? ''}`;
}

/**
 * Return the ingest pipeline name for a datastream
 */
export const getPipelineNameForDatastream = ({
  dataStream,
  packageVersion,
}: {
  dataStream: { dataset: string; type: string };
  packageVersion: string;
}): string => {
  return `${dataStream.type}-${dataStream.dataset}-${packageVersion}`;
};

/**
 * Return the custom user ingest pipeline name for a datastream
 */
export const getCustomPipelineNameForDatastream = (dataStream: {
  dataset: string;
  type: string;
}): string => {
  return `${dataStream.type}-${dataStream.dataset}@custom`;
};
