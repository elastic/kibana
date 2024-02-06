/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { IScopedClusterClient } from '@kbn/core-elasticsearch-server';
import type { ISearchGeneric } from '@kbn/data-plugin/common';
import { MitigationResult, MitigationType } from '../../../../common';

export interface GenericMitigationImplementation<Args extends object> {
  id: MitigationType;
  apply: (
    dependencies: DataStreamQualityMitigationDependencies
  ) => (args: Args) => Promise<MitigationResult>;
}

export interface DataStreamQualityMitigationDependencies {
  search: ISearchGeneric;
  elasticsearchClient: IScopedClusterClient;
}
