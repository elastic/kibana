/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ELASTICSEARCH_URL_PLACEHOLDER } from '../constants';
import { useKibanaServices } from './use_kibana';

export const useElasticsearchUrl = () => {
  const { cloud } = useKibanaServices();

  return { elasticsearchUrl: cloud?.elasticsearchUrl ?? ELASTICSEARCH_URL_PLACEHOLDER };
};
