/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { ESTermQuery } from '../../../../common/typed_json';
import { Filter, IIndexPattern } from '../../../../../../../src/plugins/data/public';
import { NarrowDateRange } from '../../../common/components/ml/types';
import { InspectQuery, Refetch } from '../../../common/store/inputs/model';

import { HostsTableType, HostsType } from '../../store/model';
import { NavTab } from '../../../common/components/navigation/types';
import { UpdateDateRange } from '../../../common/components/charts/common';

export type KeyHostsNavTabWithoutMlPermission = HostsTableType.hosts &
  HostsTableType.authentications &
  HostsTableType.uncommonProcesses &
  HostsTableType.events;

type KeyHostsNavTabWithMlPermission = KeyHostsNavTabWithoutMlPermission & HostsTableType.anomalies;

type KeyHostsNavTab = KeyHostsNavTabWithoutMlPermission | KeyHostsNavTabWithMlPermission;

export type HostsNavTab = Record<KeyHostsNavTab, NavTab>;

export type SetQuery = ({
  id,
  inspect,
  loading,
  refetch,
}: {
  id: string;
  inspect: InspectQuery | null;
  loading: boolean;
  refetch: Refetch;
}) => void;

export interface QueryTabBodyProps {
  type: HostsType;
  startDate: number;
  endDate: number;
  filterQuery?: string | ESTermQuery;
}

export type HostsComponentsQueryProps = QueryTabBodyProps & {
  deleteQuery?: ({ id }: { id: string }) => void;
  indexPattern: IIndexPattern;
  pageFilters?: Filter[];
  skip: boolean;
  setQuery: SetQuery;
  updateDateRange?: UpdateDateRange;
  narrowDateRange?: NarrowDateRange;
};

export type AlertsComponentQueryProps = HostsComponentsQueryProps & {
  filterQuery: string;
  pageFilters?: Filter[];
};

export type CommonChildren = (args: HostsComponentsQueryProps) => JSX.Element;
