/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { FieldMap } from '@kbn/alerts-as-data-utils';
import aadFieldConversion from '../../routes/index/signal_aad_mapping.json';

export const getAliasesFieldMap = (): FieldMap => {
  const aliasesFieldMap: FieldMap = {};
  Object.entries(aadFieldConversion).forEach(([key, value]) => {
    aliasesFieldMap[key] = {
      type: 'alias',
      required: false,
      path: value,
    };
  });
  return aliasesFieldMap;
};
