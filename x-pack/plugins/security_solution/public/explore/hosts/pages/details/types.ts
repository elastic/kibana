/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { DataViewBase, Filter } from '@kbn/es-query';
import type { HostsTableType } from '../../store/model';
import type { HostsQueryProps } from '../types';
import type { NavTab } from '../../../../common/components/navigation/types';
import type { KeyHostsNavTabWithoutMlPermission } from '../navigation/types';
import type { hostsModel } from '../../store';

interface HostBodyComponentDispatchProps {
  detailName: string;
  hostDetailsPagePath: string;
}

export interface HostDetailsProps {
  detailName: string;
  hostDetailsPagePath: string;
}

type KeyHostDetailsNavTabWithoutMlPermission = HostsTableType.authentications &
  HostsTableType.uncommonProcesses &
  HostsTableType.events;

type KeyHostDetailsNavTabWithMlPermission = KeyHostsNavTabWithoutMlPermission &
  HostsTableType.anomalies;

type KeyHostDetailsNavTab =
  | KeyHostDetailsNavTabWithoutMlPermission
  | KeyHostDetailsNavTabWithMlPermission;

export type HostDetailsNavTab = Record<KeyHostDetailsNavTab, NavTab>;

export type HostDetailsTabsProps = HostBodyComponentDispatchProps &
  HostsQueryProps & {
    indexNames: string[];
    hostDetailsFilter: Filter[];
    filterQuery?: string;
    indexPattern: DataViewBase;
    type: hostsModel.HostsType;
  };
