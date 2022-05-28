/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ActionCreator } from 'typescript-fsa';
import type { DataViewBase, Filter, Query } from '@kbn/es-query';
import { InputsModelId } from '../../../common/store/inputs/constants';
import { HostsTableType } from '../../store/model';
import { HostsQueryProps } from '../types';
import { NavTab } from '../../../common/components/navigation/types';
import { KeyHostsNavTabWithoutMlPermission } from '../navigation/types';
import { hostsModel } from '../../store';
import { DocValueFields } from '../../../common/containers/source';

interface HostDetailsComponentReduxProps {
  query: Query;
  filters: Filter[];
}

interface HostBodyComponentDispatchProps {
  setAbsoluteRangeDatePicker: ActionCreator<{
    id: InputsModelId;
    from: string;
    to: string;
  }>;
  detailName: string;
  hostDetailsPagePath: string;
}

interface HostDetailsComponentDispatchProps extends HostBodyComponentDispatchProps {
  setHostDetailsTablesActivePageToZero: ActionCreator<null>;
}

export interface HostDetailsProps {
  detailName: string;
  hostDetailsPagePath: string;
}

export type HostDetailsComponentProps = HostDetailsComponentReduxProps &
  HostDetailsComponentDispatchProps &
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
    docValueFields?: DocValueFields[];
    indexNames: string[];
    pageFilters?: Filter[];
    filterQuery?: string;
    indexPattern: DataViewBase;
    type: hostsModel.HostsType;
  };

export type SetAbsoluteRangeDatePicker = ActionCreator<{
  id: InputsModelId;
  from: string;
  to: string;
}>;
