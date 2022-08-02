/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ESTermQuery } from '../../../../common/typed_json';
import { NetworkType } from '../../store/model';
import type { GlobalTimeArgs } from '../../../common/containers/use_global_time';

export const type = NetworkType.details;

export interface OwnProps {
  type: NetworkType;
  startDate: string;
  endDate: string;
  filterQuery?: string | ESTermQuery;
  ip: string;
  indexNames: string[];
  skip: boolean;
  setQuery: GlobalTimeArgs['setQuery'];
}
