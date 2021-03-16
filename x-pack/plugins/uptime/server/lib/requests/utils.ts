/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { FieldDescriptor, IndexPatternsFetcher } from '../../../../../../src/plugins/data/server';
import { UptimeESClient } from '../lib';

export const getFieldByName = (
  fieldName: string,
  fields: FieldDescriptor[]
): FieldDescriptor | undefined => {
  return fields && fields.find((f) => f.name === fieldName);
};

export const findIndexPatternById = async (uptimeEsClient: UptimeESClient, index: string) => {
  const indexPatternsFetcher = new IndexPatternsFetcher(uptimeEsClient.baseESClient);

  const fields = await indexPatternsFetcher.getFieldsForWildcard({
    pattern: index,
  });

  return { fields };
};
