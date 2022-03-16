/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Meta } from '../../../../../common/types';
import { Result, ResultMeta } from '../result/types';

export interface CurationSuggestion {
  query: string;
  updated_at: string;
  promoted: string[];
  status: 'pending' | 'applied' | 'automated' | 'rejected' | 'disabled';
  curation_id?: string; // The id of an existing curation that this suggestion would affect
  operation: 'create' | 'update' | 'delete';
  override_manual_curation?: boolean;
}

// A curation suggestion with linked ids hydrated with actual values
export interface HydratedCurationSuggestion
  extends Omit<CurationSuggestion, 'promoted' | 'curation_id'> {
  organic: Curation['organic'];
  promoted: Curation['promoted'];
  curation?: Curation;
}

export interface Curation {
  id: string;
  last_updated: string;
  queries: string[];
  promoted: CurationResult[];
  hidden: CurationResult[];
  organic?: Result[]; // this field is missing if there are 0 results
  suggestion?: CurationSuggestion;
}

export interface CurationsAPIResponse {
  results: Curation[];
  meta: Meta;
}

export interface CurationResult {
  // TODO: Consider updating our internal API to return more standard Result data in the future
  id: string;
  _meta?: ResultMeta;
  [key: string]: string | string[] | ResultMeta | undefined;
}
