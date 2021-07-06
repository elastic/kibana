/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { UebaType } from '../../store/model';
import { GlobalTimeArgs } from '../../../common/containers/use_global_time';
import { ESTermQuery } from '../../../../common/typed_json';
import { DocValueFields } from '../../../../../timelines/common';
import { Filter } from '../../../../../../../src/plugins/data/common';
import { UpdateDateRange } from '../../../common/components/charts/common';
import { NarrowDateRange } from '../../../common/components/ml/types';

export interface QueryTabBodyProps {
  type: UebaType;
  startDate: GlobalTimeArgs['from'];
  endDate: GlobalTimeArgs['to'];
  filterQuery?: string | ESTermQuery;
}

export type UebaComponentsQueryProps = QueryTabBodyProps & {
  deleteQuery?: GlobalTimeArgs['deleteQuery'];
  docValueFields?: DocValueFields[];
  indexNames: string[];
  pageFilters?: Filter[];
  skip: boolean;
  setQuery: GlobalTimeArgs['setQuery'];
  updateDateRange?: UpdateDateRange;
  narrowDateRange?: NarrowDateRange;
};
