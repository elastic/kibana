/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { ActionCreator } from 'typescript-fsa';
import { Query, IIndexPattern, Filter } from 'src/plugins/data/public';
import { InputsModelId } from '../../../common/store/inputs/constants';
import { HostComponentProps } from '../../../common/components/link_to/redirect_to_hosts';
import { HostsTableType } from '../../store/model';
import { HostsQueryProps } from '../types';
import { NavTab } from '../../../common/components/navigation/types';
import { KeyHostsNavTabWithoutMlPermission } from '../navigation/types';
import { hostsModel } from '../../store';

interface HostDetailsComponentReduxProps {
  query: Query;
  filters: Filter[];
}

interface HostBodyComponentDispatchProps {
  setAbsoluteRangeDatePicker: ActionCreator<{
    id: InputsModelId;
    from: number;
    to: number;
  }>;
  detailName: string;
  hostDetailsPagePath: string;
}

interface HostDetailsComponentDispatchProps extends HostBodyComponentDispatchProps {
  setHostDetailsTablesActivePageToZero: ActionCreator<null>;
}

export interface HostDetailsProps extends HostsQueryProps {
  detailName: string;
  hostDetailsPagePath: string;
}

export type HostDetailsComponentProps = HostDetailsComponentReduxProps &
  HostDetailsComponentDispatchProps &
  HostComponentProps &
  HostsQueryProps;

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
    pageFilters?: Filter[];
    filterQuery: string;
    indexPattern: IIndexPattern;
    type: hostsModel.HostsType;
  };

export type SetAbsoluteRangeDatePicker = ActionCreator<{
  id: InputsModelId;
  from: number;
  to: number;
}>;
