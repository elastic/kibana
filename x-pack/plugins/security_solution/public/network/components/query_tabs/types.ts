/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { DataViewBase } from '@kbn/es-query';
import { DocValueFields } from '../../../common/containers/source';
import { GlobalTimeArgs } from '../../../common/containers/use_global_time';
import { networkModel } from '../../store';
import { ESTermQuery } from '../../../../common/typed_json';
import { NarrowDateRange } from '../../../common/components/ml/types';
import { FlowTarget } from '../../../../common/search_strategy';

interface QueryTabBodyProps extends Pick<GlobalTimeArgs, 'setQuery' | 'deleteQuery'> {
  endDate: string;
  filterQuery?: string | ESTermQuery;
  indexNames: string[];
  ip?: string;
  narrowDateRange?: NarrowDateRange;
  skip: boolean;
  startDate: string;
  type: networkModel.NetworkType;
}

export type NetworkComponentQueryProps = QueryTabBodyProps & {
  docValueFields?: DocValueFields[];
};

export type IPsQueryTabBodyProps = QueryTabBodyProps & {
  flowTarget: FlowTarget;
  indexPattern: DataViewBase;
};

export type FTQueryTabBodyProps = QueryTabBodyProps & {
  flowTarget: FlowTarget;
};

export type IPQueryTabBodyProps = FTQueryTabBodyProps & {
  ip: string;
};

export type HttpQueryTabBodyProps = QueryTabBodyProps;
