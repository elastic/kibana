/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createPercolateQueries } from '../../../signals/threat_mapping/build_threat_mapping_filter';
import {
  PercolatorQuery,
  CreateThreatQueriesForPercolatorOptions,
} from '../../../signals/threat_mapping/types';
import { fetchItems as createPercolatorQueries } from './fetch_items';

export const createThreatQueriesForPercolator = async ({
  buildRuleMessage,
  esClient,
  exceptionItems,
  listClient,
  logger,
  perPage,
  ruleId,
  ruleVersion,
  threatFilters,
  threatIndex,
  threatLanguage,
  threatMapping,
  threatQuery,
}: CreateThreatQueriesForPercolatorOptions) =>
  createPercolatorQueries<PercolatorQuery>({
    buildRuleMessage,
    esClient,
    exceptionItems,
    index: threatIndex,
    language: threatLanguage,
    listClient,
    logger,
    perPage,
    query: threatQuery,
    filters: threatFilters,
    transformHits: (hits) =>
      createPercolateQueries({ threatMapping, threatList: hits, ruleId, ruleVersion }),
  });
