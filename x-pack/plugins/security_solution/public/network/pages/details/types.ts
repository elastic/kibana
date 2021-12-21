/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { DataViewBase } from '@kbn/es-query';

import { ESTermQuery } from '../../../../common/typed_json';
import { NetworkType } from '../../store/model';
import {
  FlowTarget,
  FlowTargetSourceDest,
} from '../../../../common/search_strategy/security_solution';
import { GlobalTimeArgs } from '../../../common/containers/use_global_time';

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

export type NetworkComponentsQueryProps = OwnProps & {
  flowTarget: FlowTarget;
};

export type TlsQueryTableComponentProps = OwnProps & {
  flowTarget: FlowTargetSourceDest;
};

export type NetworkWithIndexComponentsQueryTableProps = OwnProps & {
  flowTarget: FlowTargetSourceDest;
  indexPattern: DataViewBase;
};
