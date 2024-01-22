/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { DataStreamType } from '../types';

export interface DataStreamNameParts {
  type: DataStreamType;
  dataset: string;
  namespace: string;
}

export const streamPartsToIndexPattern = ({
  typePattern,
  datasetPattern,
}: {
  datasetPattern: string;
  typePattern: string;
}) => {
  return `${typePattern}-${datasetPattern}`;
};

export const dataStreamPartsToIndexName = ({ type, dataset, namespace }: DataStreamNameParts) => {
  return `${type}-${dataset}-${namespace}`;
};

export const indexNameToDataStreamParts = (dataStreamName: string) => {
  const [type, ...dataStreamParts] = dataStreamName.split('-');
  const namespace = dataStreamParts[dataStreamParts.length - 1];
  const dataset = dataStreamParts.slice(0, dataStreamParts.length - 1).join('-');

  return {
    type: type as DataStreamType,
    dataset,
    namespace,
  };
};
