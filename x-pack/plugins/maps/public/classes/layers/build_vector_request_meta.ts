/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import _ from 'lodash';
import type { Query } from '@kbn/data-plugin/common';
import { DataFilters, VectorSourceRequestMeta } from '../../../common/descriptor_types';
import { IVectorSource } from '../sources/vector_source';
import { IJoinSource } from '../sources/join_sources';

export function buildVectorRequestMeta(
  source: IVectorSource | IJoinSource,
  fieldNames: string[],
  dataFilters: DataFilters,
  sourceQuery: Query | null | undefined,
  isForceRefresh: boolean,
  isFeatureEditorOpenForLayer: boolean
): VectorSourceRequestMeta {
  return {
    ...dataFilters,
    fieldNames: _.uniq(fieldNames).sort(),
    sourceQuery: sourceQuery ? sourceQuery : undefined,
    applyGlobalQuery: source.getApplyGlobalQuery(),
    applyGlobalTime: source.getApplyGlobalTime(),
    sourceMeta: source.getSyncMeta(dataFilters),
    applyForceRefresh: source.isESSource() ? source.getApplyForceRefresh() : false,
    isForceRefresh,
    isFeatureEditorOpenForLayer,
  };
}
