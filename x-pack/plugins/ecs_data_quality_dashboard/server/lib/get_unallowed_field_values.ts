/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { ElasticsearchClient } from '@kbn/core/server';

import { getUnallowedFieldValues as findUnallowedValues } from '@kbn/ecs-data-quality-utils';
import { GetUnallowedFieldValuesInputs } from '../schemas/get_unallowed_field_values';

export const getUnallowedFieldValues = (
  esClient: ElasticsearchClient,
  items: GetUnallowedFieldValuesInputs
) =>
  findUnallowedValues(
    esClient,
    items.map(({ indexName }) => indexName)
  );
