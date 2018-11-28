/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { DataProvider } from '../../../components/timeline/data_providers/data_provider';

// this is really indexed by DataProviderId, but typed as 'string' because
// the current version of TS prevents the use of type aliases in type signatures
export interface IdToDataProvider {
  [id: string]: DataProvider;
}

export interface DragAndDropModel {
  dataProviders: IdToDataProvider;
}
