/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ELASTIC_NAME } from '../../../common/constants';

/**
 * Given a set of input indices and a prefix this will return the elastic name
 * concatenated with the prefix.
 * @param transformIndices The indices to add the prefix to
 * @param prefix The prefix to add along with the elastic name
 * @returns The indices with the prefix string
 */
export const createIndicesFromPrefix = ({
  transformIndices,
  prefix,
}: {
  transformIndices: string[];
  prefix: string;
}): string[] => {
  return transformIndices.map((index) => `.${ELASTIC_NAME}_${prefix}_${index}`);
};
