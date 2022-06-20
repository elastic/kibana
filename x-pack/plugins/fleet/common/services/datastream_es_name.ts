/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { RegistryDataStream } from '../types';

/**
 * Return the ingest pipeline name for a datastream
 */
export const getPipelineNameForDatastream = ({
  dataStream,
  packageVersion,
}: {
  dataStream: RegistryDataStream;
  packageVersion: string;
}): string => {
  return `${dataStream.type}-${dataStream.dataset}-${packageVersion}`;
};

/**
 * Return the custom user ingest pipeline name for a datastream
 */
export const getCustomPipelineNameForDatastream = (dataStream: RegistryDataStream): string => {
  return `${dataStream.type}-${dataStream.dataset}@custom`;
};
