/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { IIndexPattern } from 'src/plugins/data/public';

import { ESTermQuery } from '../../../../common/typed_json';
import { NetworkType } from '../../store/model';
import { FlowTarget, FlowTargetSourceDest } from '../../../graphql/types';
import { GlobalTimeArgs } from '../../../common/containers/use_global_time';

export const type = NetworkType.details;

export interface IPDetailsComponentProps {
  detailName: string;
  flowTarget: FlowTarget;
}

export interface OwnProps {
  type: NetworkType;
  startDate: number;
  endDate: number;
  filterQuery: string | ESTermQuery;
  ip: string;
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
  indexPattern: IIndexPattern;
};
