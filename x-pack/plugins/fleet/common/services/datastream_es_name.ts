/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

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
