/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { IEsSearchResponse } from '@kbn/data-plugin/common';
import type { SearchTypes } from '../../../../detection_engine/types';
import type { Inspect, Maybe } from '../../../common';

export interface ManagedUserDetailsStrategyResponse extends IEsSearchResponse {
  users: ManagedUserHits;
  inspect?: Maybe<Inspect>;
}

export enum ManagedUserDatasetKey {
  ENTRA = 'entityanalytics_entra_id.user',
  OKTA = 'entityanalytics_okta.user',
}

export interface ManagedUserHit {
  _index: string;
  _id: string;
  fields?: ManagedUserFields;
}

export type ManagedUserHits = Partial<Record<ManagedUserDatasetKey, ManagedUserHit>>;

export type ManagedUserFields = Record<string, SearchTypes[]>;
