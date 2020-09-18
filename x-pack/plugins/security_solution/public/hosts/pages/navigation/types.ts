/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { ESTermQuery } from '../../../../common/typed_json';
import { Filter, IIndexPattern } from '../../../../../../../src/plugins/data/public';
import { NarrowDateRange } from '../../../common/components/ml/types';
import { GlobalTimeArgs } from '../../../common/containers/use_global_time';
import { HostsTableType, HostsType } from '../../store/model';
import { NavTab } from '../../../common/components/navigation/types';
import { UpdateDateRange } from '../../../common/components/charts/common';
import { DocValueFields } from '../../../common/containers/source';

export type KeyHostsNavTabWithoutMlPermission = HostsTableType.hosts &
  HostsTableType.authentications &
  HostsTableType.uncommonProcesses &
  HostsTableType.events;

type KeyHostsNavTabWithMlPermission = KeyHostsNavTabWithoutMlPermission & HostsTableType.anomalies;

type KeyHostsNavTab = KeyHostsNavTabWithoutMlPermission | KeyHostsNavTabWithMlPermission;

export type HostsNavTab = Record<KeyHostsNavTab, NavTab>;

export interface QueryTabBodyProps {
  type: HostsType;
  startDate: GlobalTimeArgs['from'];
  endDate: GlobalTimeArgs['to'];
  filterQuery?: string | ESTermQuery;
}

export type HostsComponentsQueryProps = QueryTabBodyProps & {
  deleteQuery?: GlobalTimeArgs['deleteQuery'];
  docValueFields?: DocValueFields[];
  indexPattern: IIndexPattern;
  pageFilters?: Filter[];
  skip: boolean;
  setQuery: GlobalTimeArgs['setQuery'];
  updateDateRange?: UpdateDateRange;
  narrowDateRange?: NarrowDateRange;
};

export type AlertsComponentQueryProps = HostsComponentsQueryProps & {
  filterQuery: string;
  pageFilters?: Filter[];
};

export type CommonChildren = (args: HostsComponentsQueryProps) => JSX.Element;
